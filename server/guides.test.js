import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const query = vi.fn();
const client = { query: vi.fn(), release: vi.fn() };

vi.mock('./db.js', () => ({
  default: { query, connect: vi.fn(async () => client) },
}));

const { extractGuideKeys, loadGuideSeeds, seedGuides, shapeGuide, updateGuide } =
  await import('./guides.js');

const lang = {
  title: 'T',
  description: 'D',
  answer: 'A',
  body: 'B',
  coverAlt: '',
  faq: [],
};

const seed = (slug, extra = {}) => ({ slug, topic: 'espejos', es: lang, en: lang, ...extra });

const row = (overrides = {}) => ({
  id: '7',
  slug: 'espejo-hollywood',
  visibility: 'public',
  position: 0,
  data: { topic: 'espejos', cover: '', products: {}, es: lang, en: lang },
  published_at: new Date('2026-10-01T10:00:00Z'),
  created_at: new Date('2026-09-30T10:00:00Z'),
  updated_at: new Date('2026-10-02T10:00:00Z'),
  ...overrides,
});

describe('shapeGuide', () => {
  it('turns a row into the article the API returns', () => {
    const guide = shapeGuide(row());
    expect(guide).toMatchObject({
      id: 7,
      slug: 'espejo-hollywood',
      topic: 'espejos',
      publishedAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-02T10:00:00.000Z',
    });
    expect(guide.revision).toMatch(/^[0-9a-f]{16}$/);
  });

  // A reorder in one tab must not make an edit in another look stale.
  it('leaves the position out of the revision', () => {
    expect(shapeGuide(row({ position: 5 })).revision).toBe(shapeGuide(row()).revision);
  });

  it('changes the revision when the text changes', () => {
    const edited = row({ data: { ...row().data, es: { ...lang, body: 'New' } } });
    expect(shapeGuide(edited).revision).not.toBe(shapeGuide(row()).revision);
  });
});

describe('updateGuide', () => {
  beforeEach(() => query.mockReset());

  it('keeps slug and visibility in their columns and the rest in data', async () => {
    query.mockResolvedValue({ rows: [row()] });
    await updateGuide(7, { slug: 's', visibility: 'off', topic: 'espejos', es: lang });
    const [, params] = query.mock.calls[0];
    expect(params.slice(0, 3)).toEqual([7, 's', 'off']);
    expect(JSON.parse(params[3])).toEqual({ topic: 'espejos', es: lang });
  });

  it('is null when the article is gone', async () => {
    query.mockResolvedValue({ rows: [] });
    expect(await updateGuide(7, { slug: 's', visibility: 'off' })).toBeNull();
  });
});

describe('extractGuideKeys', () => {
  it('collects the uploads of every article', () => {
    const keys = extractGuideKeys([
      { cover: '/uploads/a.webp', es: { body: '' } },
      { cover: '', es: { body: '![x](/uploads/b.jpg)' } },
    ]);
    expect(keys).toEqual(new Set(['a.webp', 'b.jpg']));
  });
});

describe('loadGuideSeeds', () => {
  it('reads the seed file', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'guides-')), 'seed.json');
    writeFileSync(path, JSON.stringify([seed('a')]));
    expect(loadGuideSeeds(path)).toEqual([seed('a')]);
  });

  it('is empty without a seed file', () => {
    expect(loadGuideSeeds(join(tmpdir(), 'no-such-dir', 'seed.json'))).toEqual([]);
  });

  it('ships a valid seed file', () => {
    expect(Array.isArray(loadGuideSeeds())).toBe(true);
  });
});

describe('seedGuides', () => {
  // `already` — slugs guides_seeded remembers; `taken` — slugs in guides.
  function database({ already = [], taken = [] } = {}) {
    client.query.mockReset();
    client.release.mockReset();
    client.query.mockImplementation(async (sql, params) => {
      if (sql.startsWith('INSERT INTO guides_seeded')) {
        return { rowCount: already.includes(params[0]) ? 0 : 1 };
      }
      if (sql.includes('INSERT INTO guides ')) {
        return { rowCount: taken.includes(params[0]) ? 0 : 1 };
      }
      return { rowCount: 0 };
    });
  }

  const statements = () => client.query.mock.calls.map(([sql]) => sql.trim().split(/\s+/)[0]);

  it('adds a new article as a draft, in one transaction with its mark', async () => {
    database();
    expect(await seedGuides([seed('espejo-hollywood')])).toEqual(['espejo-hollywood']);
    expect(statements()).toEqual(['BEGIN', 'INSERT', 'INSERT', 'COMMIT']);
    const [, params] = client.query.mock.calls[2];
    expect(params[1]).toBe('off');
    expect(client.release).toHaveBeenCalledOnce();
  });

  it('keeps a published seed published', async () => {
    database();
    await seedGuides([seed('espejo-hollywood', { visibility: 'public' })]);
    expect(client.query.mock.calls[2][1][1]).toBe('public');
  });

  // The owner may have deleted it since: it is theirs, not the release's.
  it('never brings back an article seeded before', async () => {
    database({ already: ['espejo-hollywood'] });
    expect(await seedGuides([seed('espejo-hollywood')])).toEqual([]);
    expect(statements()).toEqual(['BEGIN', 'INSERT', 'COMMIT']);
  });

  it('leaves alone an article the owner made at the same address', async () => {
    database({ taken: ['espejo-hollywood'] });
    expect(await seedGuides([seed('espejo-hollywood')])).toEqual([]);
  });

  it('skips a seed it cannot store and goes on with the rest', async () => {
    database();
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await seedGuides([seed('Bad Slug'), seed('bien')])).toEqual(['bien']);
    expect(errors).toHaveBeenCalledWith(expect.stringContaining('Bad Slug'));
    errors.mockRestore();
  });

  it('rolls back and releases the connection when a statement fails', async () => {
    database();
    client.query.mockImplementation(async (sql) => {
      if (sql.includes('INSERT INTO guides ')) throw new Error('disk full');
      return { rowCount: 1 };
    });
    await expect(seedGuides([seed('a')])).rejects.toThrow('disk full');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalledOnce();
  });
});
