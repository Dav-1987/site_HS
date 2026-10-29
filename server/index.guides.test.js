// @vitest-environment node
//
// The «Guías» API through the real routes. The articles live in an in-memory
// stand-in for guides.js (whose SQL has tests of its own), the catalog and the
// settings in fixed ones; what is checked here is only what the routes do —
// who may do what, the conflict answers, the fixed address of a published
// article, and which uploads a save hands to the cleanup.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

const db = vi.hoisted(() => ({ guides: [], nextId: 1, authed: true }));

vi.mock('./guides.js', async (importOriginal) => {
  const actual = await importOriginal();
  const store = (guide, id, previous) => ({
    ...guide,
    id,
    publishedAt:
      previous?.publishedAt ?? (guide.visibility === 'public' ? '2026-10-29T00:00:00.000Z' : null),
    revision: `rev-${id}-${JSON.stringify(guide).length}`,
  });
  return {
    ...actual,
    listGuides: vi.fn(async ({ includeDrafts } = {}) =>
      structuredClone(db.guides.filter((g) => includeDrafts || g.visibility === 'public')),
    ),
    getGuide: vi.fn(async (id) => structuredClone(db.guides.find((g) => g.id === id) ?? null)),
    createGuide: vi.fn(async (guide) => {
      if (db.guides.some((g) => g.slug === guide.slug))
        throw Object.assign(new Error(), { code: '23505' });
      const saved = store(guide, db.nextId++);
      db.guides.push(saved);
      return structuredClone(saved);
    }),
    updateGuide: vi.fn(async (id, guide) => {
      if (db.guides.some((g) => g.slug === guide.slug && g.id !== id))
        throw Object.assign(new Error(), { code: '23505' });
      const i = db.guides.findIndex((g) => g.id === id);
      if (i < 0) return null;
      db.guides[i] = store(guide, id, db.guides[i]);
      return structuredClone(db.guides[i]);
    }),
    deleteGuide: vi.fn(async (id) => {
      const before = db.guides.length;
      db.guides = db.guides.filter((g) => g.id !== id);
      return db.guides.length < before;
    }),
    reorderGuides: vi.fn(async (ids) => {
      db.guides.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    }),
  };
});

// The catalog shares one photo with an article: dropping it from the article
// must not queue it for deletion.
vi.mock('./store.js', async (importOriginal) => ({
  ...(await importOriginal()),
  readOrSeedCatalog: vi.fn(async () => [
    { slug: 'espejos', image: '/uploads/shared.webp', products: [] },
  ]),
  scheduleForDeletion: vi.fn(async () => {}),
  unscheduleFiles: vi.fn(async () => {}),
}));

vi.mock('./settings.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, readSettings: vi.fn(async () => actual.mergeSettings(null)) };
});

vi.mock('./auth.js', async (importOriginal) => ({
  ...(await importOriginal()),
  isAuthenticated: () => db.authed,
}));

const { default: app } = await import('./index.js');
const { scheduleForDeletion, unscheduleFiles } = await import('./store.js');
const { reorderGuides } = await import('./guides.js');

const lang = (title) => ({
  title,
  description: 'D',
  answer: 'A',
  body: 'B',
  coverAlt: '',
  faq: [],
});

const article = (overrides = {}) => ({
  slug: 'espejo-hollywood',
  visibility: 'off',
  topic: 'espejos',
  cover: '',
  products: {},
  es: lang('Espejo Hollywood'),
  en: lang('Hollywood mirror'),
  ...overrides,
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
  db.guides = [];
  db.nextId = 1;
  db.authed = true;
  vi.mocked(scheduleForDeletion).mockClear();
  vi.mocked(unscheduleFiles).mockClear();
});

const send = (method, path, body) =>
  fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

async function create(overrides) {
  const res = await send('POST', '/api/guides', { guide: article(overrides) });
  return (await res.json()).guide;
}

describe('reading the articles', () => {
  it('gives the public only what is published', async () => {
    await create({ slug: 'borrador' });
    await create({ slug: 'publicado', visibility: 'public' });
    db.authed = false;
    const { guides } = await (await send('GET', '/api/guides')).json();
    expect(guides.map((g) => g.slug)).toEqual(['publicado']);
  });

  it('gives the admin the drafts as well', async () => {
    await create({ slug: 'borrador' });
    const { guides } = await (await send('GET', '/api/guides')).json();
    expect(guides.map((g) => g.slug)).toEqual(['borrador']);
  });
});

describe('changing the articles', () => {
  it('is for the admin only', async () => {
    db.authed = false;
    expect((await send('POST', '/api/guides', { guide: article() })).status).toBe(401);
    expect((await send('PUT', '/api/guides/1', { guide: article() })).status).toBe(401);
    expect((await send('DELETE', '/api/guides/1')).status).toBe(401);
    expect((await send('PUT', '/api/guides/order', { ids: [1] })).status).toBe(401);
  });

  it('creates a draft', async () => {
    const res = await send('POST', '/api/guides', { guide: article() });
    expect(res.status).toBe(201);
    expect((await res.json()).guide).toMatchObject({ id: 1, visibility: 'off' });
  });

  it('refuses what the rules refuse, with the reason', async () => {
    const res = await send('POST', '/api/guides', { guide: article({ topic: 'cocinas' }) });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/topic/);
  });

  it('answers 409 for an address another article has', async () => {
    await create();
    const res = await send('POST', '/api/guides', { guide: article() });
    expect(res.status).toBe(409);
    expect((await res.json()).conflict).toBe('slug');
  });

  it('saves an edit made on the latest version', async () => {
    const saved = await create();
    const res = await send('PUT', `/api/guides/${saved.id}`, {
      guide: article({ es: lang('Nuevo título') }),
      baseRevision: saved.revision,
    });
    expect(res.status).toBe(200);
    expect((await res.json()).guide.es.title).toBe('Nuevo título');
  });

  it('turns away an edit made on a version changed since', async () => {
    const saved = await create();
    await send('PUT', `/api/guides/${saved.id}`, { guide: article({ es: lang('Otra pestaña') }) });
    const res = await send('PUT', `/api/guides/${saved.id}`, {
      guide: article({ es: lang('Esta pestaña') }),
      baseRevision: saved.revision,
    });
    expect(res.status).toBe(409);
    expect((await res.json()).conflict).toBe('guide');
  });

  it('lets a draft change its address', async () => {
    const saved = await create();
    const res = await send('PUT', `/api/guides/${saved.id}`, { guide: article({ slug: 'otro' }) });
    expect(res.status).toBe(200);
  });

  // Search results and AI answers may already link to it.
  it('keeps the address of an article once it was published', async () => {
    const saved = await create({ visibility: 'public' });
    const res = await send('PUT', `/api/guides/${saved.id}`, {
      guide: article({ slug: 'otro', visibility: 'off' }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/keeps its address/);
  });

  it('answers 404 for an article that is not there', async () => {
    expect((await send('PUT', '/api/guides/99', { guide: article() })).status).toBe(404);
    expect((await send('DELETE', '/api/guides/99')).status).toBe(404);
  });

  it('refuses an id that is no id', async () => {
    expect((await send('PUT', '/api/guides/abc', { guide: article() })).status).toBe(400);
  });

  it('deletes an article', async () => {
    const saved = await create();
    expect((await send('DELETE', `/api/guides/${saved.id}`)).status).toBe(200);
    expect(db.guides).toEqual([]);
  });
});

describe('the order of the articles', () => {
  it('reorders and returns the list', async () => {
    await create({ slug: 'uno' });
    await create({ slug: 'dos' });
    const res = await send('PUT', '/api/guides/order', { ids: [2, 1] });
    expect(res.status).toBe(200);
    expect((await res.json()).guides.map((g) => g.slug)).toEqual(['dos', 'uno']);
  });

  it.each([
    ['no list', {}],
    ['a repeated id', { ids: [1, 1] }],
    ['an id that is no number', { ids: ['1'] }],
  ])('refuses %s', async (_, body) => {
    expect((await send('PUT', '/api/guides/order', body)).status).toBe(400);
    expect(reorderGuides).not.toHaveBeenCalledWith(body.ids);
  });
});

describe('uploads an article stops using', () => {
  it('queues a photo nothing else uses', async () => {
    const saved = await create({ cover: '/uploads/own.webp' });
    await send('PUT', `/api/guides/${saved.id}`, { guide: article({ cover: '' }) });
    expect(scheduleForDeletion).toHaveBeenCalledWith(new Set(['own.webp']));
  });

  it('leaves a photo the catalog still uses', async () => {
    const saved = await create({ cover: '/uploads/shared.webp' });
    await send('DELETE', `/api/guides/${saved.id}`);
    expect(scheduleForDeletion).not.toHaveBeenCalled();
  });

  it('takes a photo the article uses again out of the queue', async () => {
    await create({ es: { ...lang('A'), body: '![x](/uploads/back.jpg)' } });
    expect(unscheduleFiles).toHaveBeenCalledWith(new Set(['back.jpg']));
  });
});
