// ============================================================
// HS Muebles — Catalog helpers
// The DATA now lives in catalog.default.json (single source of
// truth, shared with the Netlify function that seeds the DB).
// At runtime the live catalog comes from /api/catalog via
// CatalogContext; this file only provides the default dataset
// (used as the instant first paint + offline fallback) and the
// pure helpers that operate on whatever catalog is passed in.
// ============================================================

import defaultCatalogData from './catalog.default.json';

/** The bundled default catalog (instant first paint + fallback). */
export const defaultCatalog = defaultCatalogData;

/** Build a sized Unsplash URL from a photo id token. */
export function unsplash(id, w = 900) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;
}

/**
 * Resolve an `image` field to a usable src. Three formats:
 *  - /uploads/<hash>.<ext>      → nearest pre-generated WebP size (_400/_800/_1600)
 *  - an Unsplash photo id token → expanded via unsplash() (already optimized)
 *  - a full external URL        → used as-is
 */
export function resolveImage(image, w = 900) {
  if (!image) return null;
  if (image.startsWith('/uploads/')) {
    const size = w <= 400 ? 400 : w <= 900 ? 800 : 1600;
    return image.replace(/\.[^.]+$/, `_${size}.webp`);
  }
  if (image.startsWith('/')) return image;
  if (/^https?:\/\//.test(image)) return image;
  return unsplash(image, w);
}

/** Ordered image gallery for a product: explicit `images`, else the cover `image`. */
export function productImages(product) {
  const list = Array.isArray(product?.images) ? product.images.filter(Boolean) : [];
  if (list.length) return list;
  return product?.image ? [product.image] : [];
}

/**
 * Discount info. `oldPrice` is the pre-discount price; it's shown struck through
 * next to the current `price` only when it is set and strictly higher.
 */
export function productDiscount(product) {
  const oldPrice = Number(product?.oldPrice) || 0;
  const price = Number(product?.price) || 0;
  const onSale = oldPrice > price && price > 0;
  return {
    onSale,
    oldPrice,
    price,
    percent: onSale ? Math.round((1 - price / oldPrice) * 100) : 0,
  };
}

// Furniture-type words that prefix product names (e.g. "Tocador T-01") and
// shouldn't repeat in the "Referencia" spec row, which is meant to read as
// a bare model code. Longer phrases are listed before the words they
// contain ("Consola Con Espejo" before "Consola"/"Espejo") so they're
// stripped as a whole instead of leaving an orphaned leftover word.
const REFERENCE_STRIP_WORDS = [
  'Consola Con Espejo',
  'Mesa De Manicura',
  'Espejo Alto',
  'Estantería',
  'Tocador',
  'Espejo',
  'Comoda',
  'Consola',
];

/** Product name with the furniture-type word(s) stripped, for the "Referencia" spec row. */
export function productReference(name) {
  if (!name) return name;
  let out = name;
  for (const word of REFERENCE_STRIP_WORDS) {
    out = out.replace(new RegExp(word, 'gi'), '');
  }
  return out.replace(/\s+/g, ' ').trim();
}

/** Lookup helper used by the dynamic category route. */
export function findCategory(categories, slug) {
  return categories.find((c) => c.slug === slug);
}

/** Find a product by its (globally unique) id, with its parent category. */
export function findProduct(categories, id) {
  for (const category of categories) {
    const product = category.products.find((p) => p.id === id);
    if (product) return { product, category };
  }
  return null;
}

/** Shape a product for the card grid: attach its parent category slug + name. */
function withCategory(product, category) {
  return { ...product, categorySlug: category.slug, category: category.name };
}

/**
 * Resolve a list of product ids (admin-curated, ordered) into card-ready
 * products. Missing/stale ids are skipped so the section never breaks.
 */
function resolveIds(categories, ids, { exclude } = {}) {
  const out = [];
  for (const id of ids) {
    if (exclude && id === exclude) continue;
    const found = findProduct(categories, id);
    if (found) out.push(withCategory(found.product, found.category));
  }
  return out;
}

/**
 * Products for the homepage "Featured" section.
 *  - If `featuredIds` is a non-empty, ordered list → resolve those (admin choice).
 *  - Otherwise fall back to a curated set of signature pieces, with guards so it
 *    never throws if the catalog shape changes (admin edits, fewer items, etc.).
 */
export function computeFeatured(categories, featuredIds) {
  if (Array.isArray(featuredIds) && featuredIds.length) {
    const manual = resolveIds(categories, featuredIds);
    if (manual.length) return manual;
    // All ids were stale → fall through to the auto-curated set below.
  }

  const picks = [
    [0, 2],
    [6, 2],
    [4, 0],
    [2, 1],
  ];
  const out = [];
  for (const [ci, pi] of picks) {
    const c = categories[ci];
    const p = c?.products?.[pi];
    if (c && p) out.push(withCategory(p, c));
  }
  // Fallback: take the first product of the first categories.
  if (out.length === 0) {
    for (const c of categories) {
      const p = c?.products?.[0];
      if (p) out.push(withCategory(p, c));
      if (out.length >= 4) break;
    }
  }
  return out;
}

/**
 * Products for a product page's "You may also like" block.
 *  - If the product has a non-empty `related` id list → resolve those (admin
 *    choice), excluding the product itself.
 *  - Otherwise fall back to other products from the same category.
 * Always capped to `limit` to keep the grid to a single row.
 */
export function computeRelated(categories, product, category, relatedIds, limit = 4) {
  if (Array.isArray(relatedIds) && relatedIds.length) {
    const manual = resolveIds(categories, relatedIds, { exclude: product.id }).slice(0, limit);
    if (manual.length) return manual;
    // All ids were stale → fall through to the same-category default below.
  }

  return category.products
    .filter((p) => p.id !== product.id)
    .slice(0, limit)
    .map((p) => withCategory(p, category));
}

// Deterministic templated descriptions so every product reads consistently
// and stays easy to replace with real marketing copy later.
const DESC_INTROS = {
  es: [
    'Una pieza serena que equilibra presencia y ligereza.',
    'Líneas puras y proporciones cuidadas para el día a día.',
    'Diseño atemporal pensado para acompañarte durante años.',
    'El gesto justo: funcional, silencioso y duradero.',
  ],
  en: [
    'A serene piece that balances presence and lightness.',
    'Pure lines and careful proportions for everyday life.',
    'Timeless design made to stay with you for years.',
    'The right gesture: functional, quiet and lasting.',
  ],
};

function hashIndex(str, mod) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h + str.charCodeAt(i)) % mod;
  return h;
}

/** Bilingual product description.
 *  Uses product.description[lang] if set; falls back to auto-generated text. */
export function productDescription(product, category, lang) {
  const manual = product.description?.[lang];
  if (manual && manual.trim()) return manual.trim();

  const intro = DESC_INTROS[lang][hashIndex(product.id, DESC_INTROS[lang].length)];
  const mat = product.material[lang].toLowerCase();
  const cat = category.name[lang];
  const second =
    lang === 'es'
      ? `Fabricado en ${mat}, con unas medidas de ${product.size}. Forma parte de la colección ${cat}.`
      : `Crafted in ${mat}, measuring ${product.size}. Part of the ${cat} collection.`;
  return `${intro} ${second}`;
}
