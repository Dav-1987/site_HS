// @vitest-environment node
//
// Two admin tabs saving over each other (see revision.js), through the real
// routes. The database is an in-memory stand-in: the store's and the settings'
// reads and writes are replaced, everything else in them is the real code.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

const db = vi.hoisted(() => ({ catalog: [], settings: null, version: [] }));
// A read that takes a moment, so two saves sent together would interleave
// their check and their write if nothing kept them apart.
const tick = () => new Promise((r) => setTimeout(r, 5));

vi.mock('./store.js', async (importOriginal) => ({
  ...(await importOriginal()),
  readOrSeedCatalog: vi.fn(async () => {
    await tick();
    return structuredClone(db.catalog);
  }),
  writeCatalog: vi.fn(async (categories) => {
    await tick();
    db.catalog = structuredClone(categories);
  }),
  recordVersion: vi.fn(async () => {}),
  getVersionData: vi.fn(async (id) => (id === 7 ? structuredClone(db.version) : null)),
  scheduleForDeletion: vi.fn(async () => {}),
  unscheduleFiles: vi.fn(async () => {}),
}));

vi.mock('./settings.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readSettings: vi.fn(async () => actual.mergeSettings(db.settings)),
    writeSettings: vi.fn(async (input) => {
      db.settings = actual.mergeSettings(input);
      return db.settings;
    }),
  };
});

vi.mock('./auth.js', async (importOriginal) => ({
  ...(await importOriginal()),
  isAuthenticated: () => true,
}));

const { default: app } = await import('./index.js');
const { writeCatalog } = await import('./store.js');
const { writeSettings } = await import('./settings.js');

const category = (price) => ({
  slug: 'espejos',
  name: { es: 'Espejos', en: 'Mirrors' },
  products: [{ id: 'Espejo-F-01', name: 'Espejo', price }],
});

let server;
let base;

beforeAll(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => new Promise((resolve) => server.close(resolve)));

beforeEach(() => {
  db.catalog = [category(199)];
  db.settings = null;
  db.version = [category(149)];
  vi.mocked(writeCatalog).mockClear();
  vi.mocked(writeSettings).mockClear();
});

const load = (what) => fetch(`${base}/api/${what}`).then((r) => r.json());
const post = (what, body) =>
  fetch(`${base}/api/${what}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('/api/catalog revisions', () => {
  it('hands out a revision with the catalog', async () => {
    const { revision } = await load('catalog');
    expect(revision).toMatch(/^[0-9a-f]{16}$/);
  });

  it('saves over the revision it was loaded at, and hands back the next one', async () => {
    const { revision } = await load('catalog');
    const res = await post('catalog', { categories: [category(249)], baseRevision: revision });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.revision).not.toBe(revision);
    // What the next load says, so the tab's next save is not taken as stale.
    expect(body.revision).toBe((await load('catalog')).revision);
  });

  it('turns away a tab whose catalog was saved from elsewhere since', async () => {
    const { revision } = await load('catalog');
    await post('catalog', { categories: [category(249)], baseRevision: revision }); // the phone
    vi.mocked(writeCatalog).mockClear();

    const res = await post('catalog', { categories: [category(299)], baseRevision: revision }); // the laptop
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ conflict: 'catalog' });
    expect(writeCatalog).not.toHaveBeenCalled();
    expect(db.catalog[0].products[0].price).toBe(249);
  });

  it('lets one of two saves sent at once through and turns the other away', async () => {
    const { revision } = await load('catalog');
    const statuses = await Promise.all([
      post('catalog', { categories: [category(249)], baseRevision: revision }),
      post('catalog', { categories: [category(299)], baseRevision: revision }),
    ]).then((all) => all.map((r) => r.status).sort());
    expect(statuses).toEqual([200, 409]);
  });

  it('saves without a check when no revision is named', async () => {
    await post('catalog', { categories: [category(249)] });
    const res = await post('catalog', { categories: [category(299)] });
    expect(res.status).toBe(200);
    expect(db.catalog[0].products[0].price).toBe(299);
  });

  it('still refuses an invalid catalog before looking at revisions', async () => {
    const res = await post('catalog', { categories: 'nope', baseRevision: 'whatever' });
    expect(res.status).toBe(400);
  });
});

describe('/api/versions restore', () => {
  it('hands back the revision of the catalog it restored', async () => {
    const res = await post('versions', { id: 7 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.categories[0].products[0].price).toBe(149);
    expect(body.revision).toBe((await load('catalog')).revision);
  });

  it('answers 404 for a version that is not there', async () => {
    expect((await post('versions', { id: 8 })).status).toBe(404);
  });
});

describe('/api/settings revisions', () => {
  it('saves over the revision it was loaded at, and hands back the next one', async () => {
    const { settings, revision } = await load('settings');
    const next = { ...settings, blocks: { ...settings.blocks, collections: false } };
    const res = await post('settings', { settings: next, baseRevision: revision });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.settings.blocks.collections).toBe(false);
    expect(body.revision).toBe((await load('settings')).revision);
  });

  it('turns away a tab whose settings were saved from elsewhere since', async () => {
    const { settings, revision } = await load('settings');
    await post('settings', {
      settings: { ...settings, blocks: { ...settings.blocks, collections: false } },
      baseRevision: revision,
    });
    vi.mocked(writeSettings).mockClear();

    const res = await post('settings', {
      settings: { ...settings, blocks: { ...settings.blocks, heroPromo: false } },
      baseRevision: revision,
    });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ conflict: 'settings' });
    expect(writeSettings).not.toHaveBeenCalled();
  });
});
