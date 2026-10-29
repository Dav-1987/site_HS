// ============================================================
// Mirage Muebles — Guides («Guías»): the rules an article obeys
// Shared by the API (server/guides.js — the authority, it refuses
// what breaks them) and the site and admin, which read the same
// limits instead of keeping copies that drift apart. Pure: no I/O,
// no React. The server imports it from src/data, so a server
// release ships it (scripts/deploy-server.mjs, SHARED_FILES).
// ============================================================

import { productDimensions, productPerkVariant } from './catalog.js';

/** URL segment of the section: /guias and /guias/<slug>, mirrored under /en. */
export const GUIDES_SLUG = 'guias';

/** The groups on the section page, in their order there. */
export const GUIDE_TOPICS = ['tocadores', 'espejos', 'luz-y-maquillaje'];

/** 'public' — on the site; 'off' — a draft, nowhere on the site. */
export const GUIDE_VISIBILITY = ['public', 'off'];

/** Every published article exists in both, like every other page of the site. */
export const GUIDE_LANGS = ['es', 'en'];

/** What the block of models can be narrowed to: the catalog's perk variants. */
export const GUIDE_PRODUCT_TYPES = ['bulbs', 'led'];

/** How many models the block shows when the article does not say. */
export const DEFAULT_PRODUCT_LIMIT = 4;

export const GUIDE_LIMITS = Object.freeze({
  slug: 80,
  title: 120,
  description: 300,
  answer: 1200,
  body: 40000,
  coverAlt: 200,
  faq: 12,
  question: 300,
  faqAnswer: 2000,
  url: 2048,
  pinned: 12,
  productId: 80,
  productLimit: 12,
  width: 500,
});

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CATEGORY_RE = /^[a-z0-9-]*$/;
const PRODUCT_ID_RE = /^[A-Za-z0-9-]+$/;

const text = (value) => (typeof value === 'string' ? value.trim() : '');

/** A site path ("/uploads/…", "/guias/…") or an https URL — never "//host" or a scheme like javascript:. */
function isSafeUrl(url) {
  return (url.startsWith('/') && !url.startsWith('//')) || url.startsWith('https://');
}

/** A whole number within [min, max], or null for an empty value; undefined when it is neither. */
function wholeNumber(value, min, max) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
}

function sanitizeProducts(input) {
  const rule = input && typeof input === 'object' ? input : {};
  const category = text(rule.category);
  if (!CATEGORY_RE.test(category)) return { error: `invalid products.category: "${category}"` };

  const type = text(rule.type);
  if (type && !GUIDE_PRODUCT_TYPES.includes(type))
    return { error: `unknown products.type: ${type}` };

  const minWidth = wholeNumber(rule.minWidth, 1, GUIDE_LIMITS.width);
  const maxWidth = wholeNumber(rule.maxWidth, 1, GUIDE_LIMITS.width);
  if (minWidth === undefined || maxWidth === undefined)
    return { error: `products widths must be whole numbers from 1 to ${GUIDE_LIMITS.width}` };
  if (minWidth !== null && maxWidth !== null && minWidth > maxWidth)
    return { error: 'products.minWidth is above products.maxWidth' };

  const limit = wholeNumber(rule.limit ?? DEFAULT_PRODUCT_LIMIT, 0, GUIDE_LIMITS.productLimit);
  if (limit === undefined || limit === null)
    return { error: `products.limit must be from 0 to ${GUIDE_LIMITS.productLimit}` };

  const pinned = [];
  for (const id of Array.isArray(rule.pinned) ? rule.pinned : []) {
    const value = text(id);
    if (!PRODUCT_ID_RE.test(value) || value.length > GUIDE_LIMITS.productId)
      return { error: `invalid pinned product id: "${value}"` };
    if (!pinned.includes(value)) pinned.push(value);
  }
  if (pinned.length > GUIDE_LIMITS.pinned)
    return { error: `at most ${GUIDE_LIMITS.pinned} pinned products` };

  return { products: { category, type, minWidth, maxWidth, pinned, limit } };
}

function sanitizeLang(input, lang) {
  const source = input && typeof input === 'object' ? input : {};
  const out = {};
  for (const field of ['title', 'description', 'answer', 'body', 'coverAlt']) {
    out[field] = text(source[field]);
    if (out[field].length > GUIDE_LIMITS[field])
      return { error: `${lang}.${field} is longer than ${GUIDE_LIMITS[field]} characters` };
  }

  // A pair emptied in the editor is just gone; a half-written one stays, so a
  // draft keeps what was typed (publishing asks for both halves, see below).
  const faq = [];
  for (const item of Array.isArray(source.faq) ? source.faq : []) {
    const q = text(item?.q);
    const a = text(item?.a);
    if (!q && !a) continue;
    if (q.length > GUIDE_LIMITS.question || a.length > GUIDE_LIMITS.faqAnswer)
      return { error: `${lang}.faq has a question or answer that is too long` };
    faq.push({ q, a });
  }
  if (faq.length > GUIDE_LIMITS.faq)
    return { error: `${lang}.faq has more than ${GUIDE_LIMITS.faq} questions` };
  out.faq = faq;
  return { value: out };
}

/**
 * What a published article still lacks, as "lang.field" paths ("en.body",
 * "es.faq.2"); empty when it is complete. A draft may lack anything — a page
 * missing one of its languages would leave the other's hreflang pointing at
 * nothing, so publishing asks for all of it.
 */
export function missingForPublish(guide) {
  const missing = [];
  for (const lang of GUIDE_LANGS) {
    const block = guide?.[lang] ?? {};
    for (const field of ['title', 'description', 'answer', 'body']) {
      if (!text(block[field])) missing.push(`${lang}.${field}`);
    }
    (block.faq ?? []).forEach((item, i) => {
      if (!text(item?.q) || !text(item?.a)) missing.push(`${lang}.faq.${i + 1}`);
    });
  }
  return missing;
}

/**
 * The article as it may be stored, or the first reason it may not. A
 * whitelist: anything not named here is dropped, so a new field has to be
 * added here before it can be saved at all.
 */
export function sanitizeGuide(input) {
  if (!input || typeof input !== 'object') return { error: 'guide must be an object' };

  const slug = text(input.slug);
  if (!SLUG_RE.test(slug) || slug.length > GUIDE_LIMITS.slug)
    return { error: `invalid slug: "${slug}"` };

  const visibility = input.visibility ?? 'off';
  if (!GUIDE_VISIBILITY.includes(visibility)) return { error: `unknown visibility: ${visibility}` };

  if (!GUIDE_TOPICS.includes(input.topic)) return { error: `unknown topic: ${input.topic}` };

  const cover = text(input.cover);
  if (cover && (!isSafeUrl(cover) || cover.length > GUIDE_LIMITS.url))
    return { error: 'cover must be a site path or an https URL' };

  const { products, error: productsError } = sanitizeProducts(input.products);
  if (productsError) return { error: productsError };

  const guide = { slug, visibility, topic: input.topic, cover, products };
  for (const lang of GUIDE_LANGS) {
    const { value, error } = sanitizeLang(input[lang], lang);
    if (error) return { error };
    guide[lang] = value;
  }

  if (visibility === 'public') {
    const missing = missingForPublish(guide);
    if (missing.length) return { error: `cannot publish without: ${missing.join(', ')}` };
  }
  return { guide };
}

// "/uploads/<key>" wherever it appears — the cover, a photo in the text, a
// field added later. Read off the whole article rather than a list of fields:
// a field missing from such a list is how the hourly cleanup came to delete
// the gift photos (server/store.js, extractUploadKeys).
const UPLOAD_RE = /\/uploads\/([A-Za-z0-9][A-Za-z0-9._-]*)/g;

/** The uploads an article uses, as keys (the file names in uploads/). */
export function guideUploadKeys(guide) {
  const keys = new Set();
  for (const match of JSON.stringify(guide ?? {}).matchAll(UPLOAD_RE)) {
    keys.add(match[1].replace(/\.+$/, ''));
  }
  return keys;
}

// Width of a piece in cm — a round mirror's diameter counts as its width — or
// null when its size says neither.
function widthOf(product) {
  const dimension = productDimensions(product)?.find(
    (d) => d.key === 'width' || d.key === 'diameter',
  );
  return dimension ? Number.parseFloat(dimension.value) : null;
}

/**
 * The models an article's block shows: its pinned ones first, in the order
 * given, then whatever its rule matches, narrowest first (the catalog's own
 * order between equals), up to its limit. `categories` is the catalog as
 * listings see it (CatalogContext's `categories`), so a model taken off the
 * site or hidden from listings drops out of every article by itself — pinned
 * or not. Each entry is `{ product, category }`.
 */
export function guideProducts(categories, rule) {
  const {
    category = '',
    type = '',
    minWidth = null,
    maxWidth = null,
    pinned = [],
    limit = DEFAULT_PRODUCT_LIMIT,
  } = rule ?? {};
  if (!limit) return [];

  const all = (categories ?? []).flatMap((c) =>
    (c.products ?? []).map((product) => ({ product, category: c })),
  );
  const byId = new Map(all.map((entry) => [entry.product.id, entry]));
  const picked = pinned.map((id) => byId.get(id)).filter(Boolean);
  const pinnedIds = new Set(pinned);

  const fits = ({ product, category: c }) => {
    if (pinnedIds.has(product.id)) return false;
    if (category && c.slug !== category) return false;
    if (type && productPerkVariant(product) !== type) return false;
    if (minWidth === null && maxWidth === null) return true;
    const width = widthOf(product);
    if (width === null) return false;
    return (minWidth === null || width >= minWidth) && (maxWidth === null || width <= maxWidth);
  };
  const narrowestFirst = (a, b) =>
    (widthOf(a.product) ?? Infinity) - (widthOf(b.product) ?? Infinity);

  return [...picked, ...all.filter(fits).sort(narrowestFirst)].slice(0, limit);
}
