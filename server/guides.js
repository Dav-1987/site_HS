// «Guías» — the articles of the guides section, one row each (migrate.sql).
//
// The catalog and the settings are saved whole; an article is saved on its own,
// so two articles edited in two tabs never overwrite each other, and each keeps
// an updated_at of its own — it becomes the article's <lastmod> in the sitemap,
// which is what tells IndexNow (and through Bing, ChatGPT's search) that it
// changed. What an article may contain is decided in src/data/guides.js.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pool from './db.js';
import { revisionOf } from './revision.js';
import { guideUploadKeys, sanitizeGuide } from '../src/data/guides.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_PATH = join(__dirname, '../src/data/guides.seed.json');

const COLUMNS = 'id, slug, visibility, position, data, published_at, created_at, updated_at';

const iso = (date) => (date ? new Date(date).toISOString() : null);

/**
 * A row as the API returns it. The revision leaves out the position: a
 * reorder in one tab is no reason to turn away an edit of the text in another.
 */
export function shapeGuide(row) {
  const data = row.data ?? {};
  const guide = {
    id: Number(row.id),
    slug: row.slug,
    visibility: row.visibility,
    topic: data.topic,
    cover: data.cover ?? '',
    products: data.products,
    es: data.es,
    en: data.en,
    publishedAt: iso(row.published_at),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
  return { ...guide, position: row.position, revision: revisionOf(guide) };
}

// The data column: everything sanitizeGuide returns except the fields that
// have columns of their own.
function dataOf(guide) {
  const { slug: _slug, visibility: _visibility, ...data } = guide;
  return JSON.stringify(data);
}

// A new article goes to the end of the list.
const NEXT_POSITION = '(SELECT COALESCE(MAX(position), -1) + 1 FROM guides)';

/** Published articles in their order; with `includeDrafts`, the drafts as well. */
export async function listGuides({ includeDrafts = false } = {}) {
  const where = includeDrafts ? '' : "WHERE visibility = 'public'";
  const { rows } = await pool.query(`SELECT ${COLUMNS} FROM guides ${where} ORDER BY position, id`);
  return rows.map(shapeGuide);
}

export async function getGuide(id) {
  const { rows } = await pool.query(`SELECT ${COLUMNS} FROM guides WHERE id = $1`, [id]);
  return rows[0] ? shapeGuide(rows[0]) : null;
}

/** Insert a sanitized article. A taken slug throws with code 23505. */
export async function createGuide(guide) {
  const { rows } = await pool.query(
    `INSERT INTO guides (slug, visibility, position, data, published_at)
     VALUES ($1, $2, ${NEXT_POSITION}, $3::jsonb, CASE WHEN $2 = 'public' THEN NOW() END)
     RETURNING ${COLUMNS}`,
    [guide.slug, guide.visibility, dataOf(guide)],
  );
  return shapeGuide(rows[0]);
}

/**
 * Overwrite an article with a sanitized one; null when there is no such row.
 * updated_at moves only when something actually changed, so pressing «Сохранить»
 * on an untouched article does not tell search engines it is new.
 * published_at is set by the first publication and kept for good.
 */
export async function updateGuide(id, guide) {
  const { rows } = await pool.query(
    `UPDATE guides SET
       slug = $2,
       visibility = $3,
       data = $4::jsonb,
       updated_at = CASE
         WHEN slug IS DISTINCT FROM $2 OR visibility IS DISTINCT FROM $3
           OR data IS DISTINCT FROM $4::jsonb THEN NOW()
         ELSE updated_at END,
       published_at = CASE WHEN $3 = 'public' THEN COALESCE(published_at, NOW())
         ELSE published_at END
     WHERE id = $1
     RETURNING ${COLUMNS}`,
    [id, guide.slug, guide.visibility, dataOf(guide)],
  );
  return rows[0] ? shapeGuide(rows[0]) : null;
}

/** Delete an article. Returns false if no row matched. */
export async function deleteGuide(id) {
  const { rowCount } = await pool.query('DELETE FROM guides WHERE id = $1', [id]);
  return rowCount > 0;
}

/** Put the articles in the order of `ids`; ids not listed keep their position. */
export async function reorderGuides(ids) {
  await pool.query(
    `UPDATE guides AS g SET position = o.pos - 1
     FROM unnest($1::bigint[]) WITH ORDINALITY AS o(id, pos)
     WHERE g.id = o.id`,
    [ids],
  );
}

/** The uploads every article uses — drafts included, their photos are in use too. */
export function extractGuideKeys(guides) {
  const keys = new Set();
  for (const guide of guides ?? []) {
    for (const key of guideUploadKeys(guide)) keys.add(key);
  }
  return keys;
}

/** The articles that come with a release; none when the file is missing. */
export function loadGuideSeeds(path = SEED_PATH) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

/**
 * Put the articles that came with a release into the table — each one once,
 * ever, remembered by slug in guides_seeded. From then on the article is the
 * owner's: an edit made in /admin is not overwritten by the next restart, and
 * one deleted there does not come back. A seed is a draft unless it says
 * otherwise. Returns the slugs added.
 */
export async function seedGuides(seeds) {
  const added = [];
  for (const seed of seeds ?? []) {
    const { guide, error } = sanitizeGuide(seed);
    if (error) {
      console.error(`[guides] seed "${seed?.slug}" skipped: ${error}`);
      continue;
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const marked = await client.query(
        'INSERT INTO guides_seeded (slug) VALUES ($1) ON CONFLICT DO NOTHING RETURNING slug',
        [guide.slug],
      );
      if (marked.rowCount) {
        // An article the owner already made at this address is theirs to keep.
        const inserted = await client.query(
          `INSERT INTO guides (slug, visibility, position, data, published_at)
           VALUES ($1, $2, ${NEXT_POSITION}, $3::jsonb, CASE WHEN $2 = 'public' THEN NOW() END)
           ON CONFLICT (slug) DO NOTHING
           RETURNING slug`,
          [guide.slug, guide.visibility, dataOf(guide)],
        );
        if (inserted.rowCount) added.push(guide.slug);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  return added;
}
