// Catalog data access — port of netlify/functions/_shared/store.mts
// Replaced @netlify/database → pg pool

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pool from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultCatalog = JSON.parse(
  readFileSync(join(__dirname, '../src/data/catalog.default.json'), 'utf8'),
);

// Build the canonical ordered media list for a product. Prefers the unified
// `media` field; for products saved before it existed, synthesizes it from the
// legacy `images` + single `video` (+ `videoFirst`) fields. Mirrors
// productMedia() on the client.
function normalizeMedia(p) {
  if (Array.isArray(p?.media) && p.media.length) {
    return p.media
      .filter((m) => m && typeof m.src === 'string' && m.src)
      .map((m) => ({ type: m.type === 'video' ? 'video' : 'image', src: m.src }));
  }
  const list = (Array.isArray(p?.images) ? p.images : []).filter(
    (s) => typeof s === 'string' && s,
  );
  const photos = (list.length ? list : p?.image ? [p.image] : []).map((src) => ({
    type: 'image',
    src,
  }));
  const video = p?.video ? [{ type: 'video', src: p.video }] : [];
  return p?.videoFirst ? [...video, ...photos] : [...photos, ...video];
}

function shapeCategory(cat, products) {
  return {
    slug: cat.slug,
    name: { es: cat.name_es, en: cat.name_en },
    tagline: { es: cat.tagline_es, en: cat.tagline_en },
    description: { es: cat.description_es, en: cat.description_en },
    image: cat.image,
    imageMobile: cat.image_mobile ?? '',
    video: cat.video ?? '',
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      oldPrice: p.old_price ?? 0,
      image: p.image,
      imageMobile: p.image_mobile ?? '',
      images: Array.isArray(p.images) ? p.images : [],
      video: p.video ?? '',
      videoFirst: p.video_first === true,
      media: Array.isArray(p.media) ? p.media : [],
      material: { es: p.material_es, en: p.material_en },
      size: p.size,
      reference: p.reference ?? '',
      subtitle: p.subtitle ?? '',
      description: { es: p.description_es ?? '', en: p.description_en ?? '' },
      related: Array.isArray(p.related) ? p.related : [],
    })),
  };
}

export async function readCatalog() {
  const { rows: cats } = await pool.query(
    'SELECT * FROM categories ORDER BY position, slug',
  );
  if (cats.length === 0) return [];
  const { rows: prods } = await pool.query(
    'SELECT * FROM products ORDER BY position, name',
  );
  const byCat = new Map();
  for (const p of prods) {
    if (!byCat.has(p.category_slug)) byCat.set(p.category_slug, []);
    byCat.get(p.category_slug).push(p);
  }
  return cats.map((c) => shapeCategory(c, byCat.get(c.slug) ?? []));
}

export async function writeCatalog(categories) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM products');
    await client.query('DELETE FROM categories');

    for (let ci = 0; ci < categories.length; ci++) {
      const c = categories[ci];
      await client.query(
        `INSERT INTO categories
           (slug, name_es, name_en, tagline_es, tagline_en, description_es, description_en, image, image_mobile, video, position)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          c.slug,
          c.name?.es ?? '',
          c.name?.en ?? '',
          c.tagline?.es ?? '',
          c.tagline?.en ?? '',
          c.description?.es ?? '',
          c.description?.en ?? '',
          c.image ?? '',
          c.imageMobile ?? '',
          c.video ?? '',
          ci,
        ],
      );

      const products = c.products ?? [];
      for (let pi = 0; pi < products.length; pi++) {
        const p = products[pi];
        const media = normalizeMedia(p);
        // Photos-only list (for the legacy cover columns the card/OG/schema use).
        const gallery = media.filter((m) => m.type === 'image').map((m) => m.src);
        const cover = gallery[0] || p.image || '';
        const images = gallery.length ? gallery : cover ? [cover] : [];
        await client.query(
          `INSERT INTO products
             (id, category_slug, name, price, old_price, image, image_mobile, images, material_es, material_en, size, reference, subtitle, video, video_first, media, description_es, description_en, related, position)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17,$18,$19::jsonb,$20)`,
          [
            p.id,
            c.slug,
            p.name ?? '',
            Number.isFinite(p.price) ? p.price : 0,
            Number.isFinite(p.oldPrice) ? p.oldPrice : 0,
            cover,
            p.imageMobile ?? '',
            JSON.stringify(images),
            p.material?.es ?? '',
            p.material?.en ?? '',
            p.size ?? '',
            p.reference ?? '',
            p.subtitle ?? '',
            // Legacy single-video fields kept empty once media is the source of truth.
            '',
            false,
            JSON.stringify(media),
            p.description?.es ?? '',
            p.description?.en ?? '',
            JSON.stringify(Array.isArray(p.related) ? p.related : []),
            pi,
          ],
        );
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function readOrSeedCatalog() {
  const existing = await readCatalog();
  if (existing.length > 0) return existing;
  await writeCatalog(defaultCatalog);
  return readCatalog();
}

const MAX_VERSIONS = 50;

export async function recordVersion(categories) {
  await pool.query(
    'INSERT INTO catalog_versions (data) VALUES ($1::jsonb)',
    [JSON.stringify(categories)],
  );
  await pool.query(
    `DELETE FROM catalog_versions
     WHERE id NOT IN (
       SELECT id FROM catalog_versions ORDER BY created_at DESC, id DESC LIMIT $1
     )`,
    [MAX_VERSIONS],
  );
}

export async function listVersions() {
  const { rows } = await pool.query(
    `SELECT
       id,
       created_at,
       jsonb_array_length(data) AS category_count,
       (SELECT COALESCE(SUM(jsonb_array_length(c->'products')), 0)
          FROM jsonb_array_elements(data) AS c) AS product_count
     FROM catalog_versions
     ORDER BY created_at DESC, id DESC
     LIMIT $1`,
    [MAX_VERSIONS],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    createdAt: r.created_at,
    categoryCount: Number(r.category_count),
    productCount: Number(r.product_count),
  }));
}

export async function getVersionData(id) {
  const { rows } = await pool.query(
    'SELECT data FROM catalog_versions WHERE id = $1',
    [id],
  );
  return rows[0]?.data ?? null;
}

// ─── Orphaned-upload cleanup ──────────────────────────────────────────────────

/** Extract all /uploads/ filenames referenced in a catalog array. */
export function extractUploadKeys(categories) {
  const keys = new Set();
  const add = (url) => {
    if (typeof url === 'string' && url.startsWith('/uploads/')) keys.add(url.slice(9));
  };
  for (const c of categories ?? []) {
    add(c.image); add(c.imageMobile); add(c.video);
    for (const p of c.products ?? []) {
      add(p.image); add(p.imageMobile); add(p.video);
      for (const img of p.images ?? []) add(img);
      for (const m of p.media ?? []) add(m?.src);
    }
  }
  return keys;
}

/** Schedule orphaned files for deletion in 1 day (idempotent). */
export async function scheduleForDeletion(keys) {
  for (const filename of keys) {
    await pool.query(
      `INSERT INTO pending_deletions (filename)
       VALUES ($1)
       ON CONFLICT (filename) DO NOTHING`,
      [filename],
    );
  }
}

/** Cancel scheduled deletion for files that are back in use. */
export async function unscheduleFiles(keys) {
  if (!keys.size) return;
  await pool.query(
    'DELETE FROM pending_deletions WHERE filename = ANY($1)',
    [Array.from(keys)],
  );
}

/** Return filenames whose delete_after has passed. */
export async function getFilesReadyToDelete() {
  const { rows } = await pool.query(
    'SELECT filename FROM pending_deletions WHERE delete_after <= NOW()',
  );
  return rows.map((r) => r.filename);
}

/** Remove pending_deletions rows after files have been physically deleted. */
export async function purgePendingRecords(filenames) {
  if (!filenames.length) return;
  await pool.query(
    'DELETE FROM pending_deletions WHERE filename = ANY($1)',
    [filenames],
  );
}
