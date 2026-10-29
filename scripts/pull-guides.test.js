import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildSnapshot,
  guidesFromSeeds,
  validateGuidesPayload,
  writeSnapshot,
} from './pull-guides.mjs';

const lang = (title) => ({
  title,
  description: `${title} — description`,
  answer: 'Answer.',
  body: '## Section\n\nSee [this](/tocadores).',
  coverAlt: 'alt',
  faq: [{ q: 'Q?', a: 'A.' }],
});

const guide = (slug, extra = {}) => ({
  id: 1,
  slug,
  visibility: 'public',
  topic: 'tocadores',
  cover: '/uploads/a.jpg',
  products: { category: 'tocadores' },
  es: lang(`ES ${slug}`),
  en: lang(`EN ${slug}`),
  publishedAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-02T10:00:00.000Z',
  revision: 'abc',
  ...extra,
});

describe('validateGuidesPayload', () => {
  it('keeps the published articles with their dates', () => {
    const [g] = validateGuidesPayload({ guides: [guide('a')] });
    expect(g.slug).toBe('a');
    expect(g.updatedAt).toBe('2026-10-02T10:00:00.000Z');
    expect(g).not.toHaveProperty('revision');
  });

  it('leaves out drafts, should one ever be in the answer', () => {
    expect(validateGuidesPayload({ guides: [guide('a', { visibility: 'off' })] })).toEqual([]);
  });

  // A broken answer must never replace the snapshot and take the section down.
  it('refuses an answer without a list', () => {
    expect(() => validateGuidesPayload({ error: 'Failed' })).toThrow(/guides/);
  });

  it('refuses an article that breaks the rules, naming it', () => {
    expect(() => validateGuidesPayload({ guides: [guide('a', { topic: 'cocinas' })] })).toThrow(
      /guide "a"/,
    );
  });

  it('reads a date it cannot parse as none', () => {
    const [g] = validateGuidesPayload({ guides: [guide('a', { updatedAt: 'yesterday' })] });
    expect(g.updatedAt).toBeNull();
  });
});

describe('guidesFromSeeds', () => {
  it('takes the published seeds, without dates', () => {
    const seeds = [
      { ...guide('a'), publishedAt: undefined, updatedAt: undefined },
      guide('b', { visibility: 'off' }),
    ];
    const out = guidesFromSeeds(seeds);
    expect(out.map((g) => g.slug)).toEqual(['a']);
    expect(out[0].publishedAt).toBeNull();
  });

  it('accepts the seed file in the repo', () => {
    const seeds = JSON.parse(readFileSync('src/data/guides.seed.json', 'utf8'));
    expect(() => guidesFromSeeds(seeds)).not.toThrow();
  });
});

describe('buildSnapshot', () => {
  const { index, articles } = buildSnapshot(validateGuidesPayload({ guides: [guide('a')] }));

  it('lists what the section page and the menu need, and no more', () => {
    expect(index).toEqual([
      {
        slug: 'a',
        topic: 'tocadores',
        cover: '/uploads/a.jpg',
        publishedAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-02T10:00:00.000Z',
        es: { title: 'ES a', description: 'ES a — description', coverAlt: 'alt' },
        en: { title: 'EN a', description: 'EN a — description', coverAlt: 'alt' },
      },
    ]);
  });

  it('ships each article with its text already turned into HTML, per language', () => {
    const article = articles.get('a');
    expect(article.es.html).toContain('<h2 id="section">Section</h2>');
    expect(article.es.html).toContain('href="/tocadores"');
    expect(article.en.html).toContain('href="/en/tocadores"');
    expect(article.es.toc).toEqual([{ id: 'section', text: 'Section' }]);
    expect(article.es).not.toHaveProperty('body');
    expect(article.products).toMatchObject({ category: 'tocadores' });
  });
});

describe('writeSnapshot', () => {
  it('writes the list and the articles, and drops an article no longer published', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'guides-'));
    const articlesDir = join(dir, 'articles');
    mkdirSync(articlesDir);
    writeFileSync(join(articlesDir, 'old.json'), '{}');
    const indexPath = join(dir, 'index.json');

    const snapshot = buildSnapshot(validateGuidesPayload({ guides: [guide('a')] }));
    const result = await writeSnapshot(snapshot, { indexPath, articlesDir });

    expect(result).toEqual({ written: 1, removed: 1 });
    expect(readdirSync(articlesDir)).toEqual(['a.json']);
    expect(JSON.parse(readFileSync(indexPath, 'utf8'))[0].slug).toBe('a');
  });
});
