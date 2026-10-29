// Pull the published «Guías» articles (edited in /admin, stored in the VPS
// database) into the snapshot the build renders the section from:
//   src/data/guides.default.json         — the list: what the section page, the
//                                           menu, the sitemap and llms.txt need
//   src/data/guide-articles/<slug>.json  — one file per article, its text
//                                           already turned into HTML, loaded
//                                           only on the article's own page
//
// As with the catalog and the settings this is not a convenience: the
// prerenderer has no network, so an article reaches the static HTML that
// search engines and AI crawlers read only through these files.
//
// Usage:
//   npm run guides:pull                      (the production site)
//   node scripts/pull-guides.mjs <site-url>  (another one)
//   node scripts/pull-guides.mjs --seed      (the published articles in
//       src/data/guides.seed.json — for a branch whose articles have not
//       reached the database yet; they carry no dates until they have)

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { GUIDE_LANGS, sanitizeGuide } from '../src/data/guides.js';
import { renderGuideMarkdown } from '../src/guides/markdown.js';

const DEFAULT_URL = 'https://hsmuebles.es';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SEED_PATH = join(ROOT, 'src/data/guides.seed.json');
export const INDEX_PATH = join(ROOT, 'src/data/guides.default.json');
export const ARTICLES_DIR = join(ROOT, 'src/data/guide-articles');

const isoOrNull = (value) =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null;

/**
 * The published articles in an /api/guides answer, each checked against the
 * same rules the API saves them by — or an error naming what is wrong. A
 * malformed answer must never replace the snapshot: it would take every
 * article off the site at the next deploy.
 */
export function validateGuidesPayload(data) {
  if (!Array.isArray(data?.guides)) throw new Error('response has no `guides` array');
  return data.guides
    .filter((raw) => raw?.visibility === 'public')
    .map((raw) => {
      const { guide, error } = sanitizeGuide(raw);
      if (error) throw new Error(`guide "${raw?.slug}": ${error}`);
      return {
        ...guide,
        publishedAt: isoOrNull(raw.publishedAt),
        updatedAt: isoOrNull(raw.updatedAt),
      };
    });
}

/** The published articles in the seed file, shaped as the API would return them. */
export function guidesFromSeeds(seeds) {
  return validateGuidesPayload({ guides: seeds });
}

/** The snapshot of `guides`: the list for the section and one file per article. */
export function buildSnapshot(guides) {
  const index = [];
  const articles = new Map();
  for (const guide of guides) {
    const { slug, topic, cover, products, publishedAt, updatedAt } = guide;
    const entry = { slug, topic, cover, publishedAt, updatedAt };
    const article = { ...entry, products };
    for (const lang of GUIDE_LANGS) {
      const { title, description, answer, body, coverAlt, faq } = guide[lang];
      entry[lang] = { title, description, coverAlt };
      article[lang] = {
        title,
        description,
        answer,
        coverAlt,
        faq,
        ...renderGuideMarkdown(body, lang),
      };
    }
    index.push(entry);
    articles.set(slug, article);
  }
  return { index, articles };
}

const asJson = (value) => `${JSON.stringify(value, null, 2)}\n`;

/** Write the snapshot, and drop the file of every article no longer published. */
export async function writeSnapshot(
  { index, articles },
  { indexPath = INDEX_PATH, articlesDir = ARTICLES_DIR } = {},
) {
  await mkdir(articlesDir, { recursive: true });
  const stale = (await readdir(articlesDir)).filter(
    (name) => name.endsWith('.json') && !articles.has(name.slice(0, -'.json'.length)),
  );
  for (const name of stale) await rm(join(articlesDir, name));
  for (const [slug, article] of articles) {
    await writeFile(join(articlesDir, `${slug}.json`), asJson(article), 'utf8');
  }
  await writeFile(indexPath, asJson(index), 'utf8');
  return { written: articles.size, removed: stale.length };
}

async function fetchGuides(base) {
  const res = await fetch(`${base}/api/guides`);
  if (!res.ok) throw new Error(`Failed to fetch ${base}/api/guides — HTTP ${res.status}`);
  return validateGuidesPayload(await res.json());
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const arg = process.argv[2];
  try {
    const fromSeed = arg === '--seed';
    const base = (arg && !fromSeed ? arg : DEFAULT_URL).replace(/\/$/, '');
    const guides = fromSeed
      ? guidesFromSeeds(JSON.parse(await readFile(SEED_PATH, 'utf8')))
      : await fetchGuides(base);
    const { written, removed } = await writeSnapshot(buildSnapshot(guides));
    console.log(`✓ Pulled ${written} published guide(s) from ${fromSeed ? SEED_PATH : base}`);
    if (removed) console.log(`  removed ${removed} no longer published`);
    console.log(`  → ${INDEX_PATH}`);
  } catch (error) {
    console.error(`✗ ${error.message}`);
    process.exit(1);
  }
}
