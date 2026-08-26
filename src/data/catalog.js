// ============================================================
// Mirage Muebles — Catalog helpers
// The DATA now lives in catalog.default.json (single source of
// truth, shared with the Netlify function that seeds the DB).
// At runtime the live catalog comes from /api/catalog via
// CatalogContext; this file only provides the pure helpers that
// operate on whatever catalog is passed in, plus a lazy loader
// for the bundled default dataset.
// ============================================================

// Prerendering needs the default catalog synchronously (see
// entry-server.jsx) and the client only needs it as a last-resort
// offline fallback (see CatalogContext) — neither wants it in the
// critical client bundle (~40KB gzip), so it's a dynamic import,
// code-split into its own chunk and cached after the first call.
let defaultCatalogPromise;
export function loadDefaultCatalog() {
  if (!defaultCatalogPromise) {
    defaultCatalogPromise = import('./catalog.default.json').then((m) => m.default);
  }
  return defaultCatalogPromise;
}

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

/**
 * Unified, ordered media gallery for a product: a mix of photos and videos in
 * the exact order the admin arranged them. Each item is `{ type, src }` with
 * type `'image'` or `'video'`.
 *
 * Source of truth is `product.media`. For products saved before the unified
 * model existed, it's synthesized from the legacy `images` + single `video`
 * (+ `videoFirst`) fields so old data keeps working without a re-save.
 */
export function productMedia(product) {
  if (Array.isArray(product?.media) && product.media.length) {
    return product.media
      .filter((m) => m && typeof m.src === 'string' && m.src)
      .map((m) => ({ type: m.type === 'video' ? 'video' : 'image', src: m.src }));
  }
  // Legacy fallback: photos from `images`/`image`, plus the single `video`.
  const list = Array.isArray(product?.images) ? product.images.filter(Boolean) : [];
  const photos = (list.length ? list : product?.image ? [product.image] : []).map((src) => ({
    type: 'image',
    src,
  }));
  const video = product?.video ? [{ type: 'video', src: product.video }] : [];
  return product?.videoFirst ? [...video, ...photos] : [...photos, ...video];
}

/**
 * Ordered photo gallery (no videos) for a product. Derived from the unified
 * `media` list when present, else the legacy `images`/`image` fields. Used for
 * the catalog cover, OG image, zoom lightbox and Schema.org — all photo-only.
 */
export function productImages(product) {
  if (Array.isArray(product?.media) && product.media.length) {
    const photos = product.media
      .filter((m) => m && m.type !== 'video' && typeof m.src === 'string' && m.src)
      .map((m) => m.src);
    if (photos.length) return photos;
  }
  const list = Array.isArray(product?.images) ? product.images.filter(Boolean) : [];
  if (list.length) return list;
  return product?.image ? [product.image] : [];
}

// ─── Order perks strip ────────────────────────────────────────────────────────
//
// The three-icon row under the order button on a product page. Every variant
// shares the first two perks (delivery, installation); only the third differs,
// so each product advertises whichever claim is actually true for it — a free
// set of bulbs, built-in professional LED lighting, or plain build quality.
// The variant key is stored per product in `product.perks` (see the admin's
// ProductEditor) and names the i18n key of that third perk: `order.perk.<key>`.
export const PERK_VARIANTS = ['bulbs', 'led', 'quality'];
export const DEFAULT_PERK_VARIANT = 'quality';

/**
 * The perk variant a product advertises. Products with no variant set (and any
 * unknown value) fall back to the default, so the strip never renders a missing
 * translation key.
 */
export function productPerkVariant(product) {
  const variant = product?.perks;
  return PERK_VARIANTS.includes(variant) ? variant : DEFAULT_PERK_VARIANT;
}

/**
 * Whether the "-N%" badge is drawn in the corner of the product's photos. An
 * admin switch, on unless explicitly turned off — the badge predates the switch,
 * so a product saved without the field (and the whole legacy catalog) keeps it.
 * Turning it off leaves the struck-through old price alone: the discount still
 * reads in the price, the photo just stays clean.
 */
export function showsDiscountBadge(product) {
  return product?.showDiscountBadge !== false;
}

/**
 * Whether the product can be ordered right now. An admin switch, on unless
 * explicitly turned off — the catalog predates the field, so anything saved
 * without it stays orderable.
 *
 * Deliberately separate from visibility: an out-of-stock product keeps its
 * place in every listing, its page and the sitemap. Only three things change —
 * the corner badge ("Agotado" instead of the discount, see ProductBadge), the
 * dimmed photo, and the dead order button; the Offer's availability in Product
 * schema follows from the same flag, which is what keeps the product feed and
 * the landing page telling Merchant Center the same story.
 */
export function isInStock(product) {
  return product?.inStock !== false;
}

/**
 * Discount info. `oldPrice` is the pre-discount price; it's shown struck through
 * next to the current `price` only when it is set and strictly higher. `badge`
 * additionally honours the per-product switch above, so every place that draws
 * the badge (catalog card, Featured card, product page) obeys it from one rule.
 */
export function productDiscount(product) {
  const oldPrice = Number(product?.oldPrice) || 0;
  const price = Number(product?.price) || 0;
  const onSale = oldPrice > price && price > 0;
  return {
    onSale,
    badge: onSale && showsDiscountBadge(product),
    oldPrice,
    price,
    percent: onSale ? Math.round((1 - price / oldPrice) * 100) : 0,
  };
}

// A product name may carry a display cut: everything before the bar is what a
// listing shows, the whole string is what the product page, the <title> and the
// feeds use. "Espejo | de cuerpo entero con bombillas LED y marco blanco" reads
// as "Espejo" on a card and in full everywhere the words have to earn a search
// result. The owner decides where the cut falls, because deriving it — first
// word, first comma — gets "Mesa de manicura" and "Consola con espejo" wrong.
//
// A name without a bar behaves exactly as before, so nothing has to be edited
// before it can be edited one product at a time.
const NAME_CUT = '|';

/** The whole name, bar removed — product page, <title>, feeds, schema. */
export function productFullName(product) {
  return String(product?.name ?? '')
    .split(NAME_CUT)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The short name a listing shows: everything before the bar. */
export function productDisplayName(product) {
  const [head] = String(product?.name ?? '').split(NAME_CUT);
  return head.replace(/\s+/g, ' ').trim();
}

/**
 * Full human label for a product: the type word plus the dimensions that
 * actually tell two items apart ("Espejo 70 × 170 cm"). `name` alone is not
 * enough — for a whole category it is the same bare word ("Espejo "), so
 * analytics, the order notification and Product schema would all report every
 * item under one indistinguishable title. Collapses the stray whitespace that
 * admin-entered names carry.
 */
export function productLabel(product) {
  return [productFullName(product), product?.subtitle]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Google shows roughly 155 characters of a description; anything past that is
// cut mid-word and wasted. The first paragraph is written to stand alone for
// exactly this reason, which also keeps the gift line — always the last line of
// a description — out of the snippet without a filter deciding it for us.
const MAX_META_DESCRIPTION = 155;
// Below this a paragraph cannot be describing anything, and a search result
// reading "." is worse than one reading the product's own name. Fifteen
// descriptions in the catalog are a single full stop.
const MIN_META_DESCRIPTION = 20;

/**
 * The description as a search snippet: first paragraph, trimmed to whole words.
 * Falls back to the label so a product without a real description still says
 * what it is.
 */
export function productMetaDescription(product, category, lang) {
  const [first = ''] = String(productDescription(product, category, lang) ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (first.length < MIN_META_DESCRIPTION) return productLabel(product);
  if (first.length <= MAX_META_DESCRIPTION) return first;
  const cut = first.slice(0, MAX_META_DESCRIPTION);
  return `${cut.slice(0, cut.lastIndexOf(' ')).trim()}…`;
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

// ─── Visibility ───────────────────────────────────────────────────────────────
//
// Every category and every product carries a three-state `visibility`, editable
// in /admin (and backed by a real Postgres column — see server/migrate.sql):
//
//   'public'   — listed everywhere. The default: anything with a missing or
//                unrecognised value is treated as public, so the whole catalog
//                keeps working unchanged.
//   'unlisted' — no link to it anywhere on the site (header menu, home page,
//                /catalogo, product grids, Featured, "related"), but the page
//                itself still works and stays in the sitemap and the index.
//                Meant for "take it off the shop window without losing the
//                Google ranking or breaking the links already out there".
//   'off'      — the page 404s and drops out of the sitemap and the prerender.
//                A category set to 'off' takes its products' pages with it.
//                The rows stay in the database; this is not a delete.
//
export const OTHER_MODELS_SLUG = 'otros-modelos';

// Sections that are surfaced by their own dedicated entry point instead of the
// standard category listings. "Otros Modelos" — the bucket five small
// categories were folded into — has a tile at the end of every category's
// product grid (see OtherModelsCard); putting it in the header menu, the home
// collections grid and /catalogo on top of that would only duplicate that door,
// and those grids are laid out for exactly four collections in a row.
//
// This says WHERE a section is surfaced, not WHETHER: its own `visibility`
// still decides that, and for such a section it governs the tile. 'public'
// lights the tile up, 'unlisted' takes the tile away too — leaving the page
// reachable by direct link and in Google, but with no link to it anywhere on
// the site. That is the whole point: the tile is a link like any other, so
// "hidden from listings" has to mean hidden from it as well.
const TILE_ENTRY_SLUGS = new Set([OTHER_MODELS_SLUG]);

/** True for a section whose only door is its own tile, not the category grids. */
export function isTileEntryCategory(category) {
  return TILE_ENTRY_SLUGS.has(category?.slug);
}

export const VISIBILITY = ['public', 'unlisted', 'off'];
export const DEFAULT_VISIBILITY = 'public';

/** A category's/product's visibility, with anything unknown read as the default. */
export function visibilityOf(entity) {
  return VISIBILITY.includes(entity?.visibility) ? entity.visibility : DEFAULT_VISIBILITY;
}

/** True when the category/product may appear in a listing (i.e. it is public). */
export function isListed(entity) {
  return visibilityOf(entity) === 'public';
}

/** True when the category/product is off the site entirely (its page must 404). */
export function isOff(entity) {
  return visibilityOf(entity) === 'off';
}

/**
 * True for categories that must never appear in a category listing — either
 * because they are not public, or because they are surfaced by their own tile
 * instead (see TILE_ENTRY_SLUGS).
 */
export function isHiddenCategory(category) {
  return !isListed(category) || isTileEntryCategory(category);
}

/** The categories a visitor may see listed. */
export function visibleCategories(categories) {
  return categories.filter((c) => !isHiddenCategory(c));
}

/** A category's products minus the ones hidden from listings. */
export function listedProducts(category) {
  return (category?.products ?? []).filter(isListed);
}

/**
 * The catalog with everything switched off removed — off categories entirely,
 * and off products from the categories that remain. Applied once at the edge
 * (see CatalogContext), so nothing downstream can resolve a slug or product id
 * that is supposed to 404, and every route/lookup/listing agrees on it.
 */
export function liveCatalog(categories) {
  return (categories ?? [])
    .filter((c) => !isOff(c))
    .map((c) => {
      const products = (c.products ?? []).filter((p) => !isOff(p));
      return products.length === (c.products ?? []).length ? c : { ...c, products };
    });
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
 * products. Missing/stale ids are skipped so the section never breaks — and so
 * are products hidden from listings: hiding a product has to take it off the
 * home page too, or the flag would do nothing where it is most visible.
 */
function resolveIds(categories, ids, { exclude } = {}) {
  const out = [];
  for (const id of ids) {
    if (exclude && id === exclude) continue;
    const found = findProduct(categories, id);
    if (found && isListed(found.product)) out.push(withCategory(found.product, found.category));
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

  // Auto-curation picks blind, by position — so it draws from the listed
  // collections only. A hand-picked `featuredIds` above may point anywhere.
  const visible = visibleCategories(categories);
  const picks = [
    [0, 2],
    [6, 2],
    [4, 0],
    [2, 1],
  ];
  const out = [];
  for (const [ci, pi] of picks) {
    const c = visible[ci];
    const p = listedProducts(c)[pi];
    if (c && p) out.push(withCategory(p, c));
  }
  // Fallback: take the first product of the first categories.
  if (out.length === 0) {
    for (const c of visible) {
      const p = listedProducts(c)[0];
      if (p) out.push(withCategory(p, c));
      if (out.length >= 4) break;
    }
  }
  return out;
}

/**
 * Resolve admin-curated Featured cards into card-ready items. Each input card is
 * `{ productId, cover, video }`; the output is the resolved product (shaped with
 * its category slug/name) augmented with `featuredCover` + `featuredVideo`, so it
 * slots straight into the carousel track. Cards whose `productId` is missing/stale
 * — or whose product is hidden from listings — are skipped so the section never
 * breaks. `cover` falls back to the product's first photo when not set.
 */
export function resolveFeaturedCards(categories, cards) {
  if (!Array.isArray(cards)) return [];
  const out = [];
  for (const card of cards) {
    if (!card || typeof card !== 'object') continue;
    const found = findProduct(categories, card.productId);
    if (!found || !isListed(found.product)) continue;
    const product = withCategory(found.product, found.category);
    const cover = card.cover || productImages(found.product)[0] || '';
    out.push({ ...product, featuredCover: cover, featuredVideo: card.video || '' });
  }
  return out;
}

/**
 * Products for a product page's "You may also like" block.
 *  - If the product has a non-empty `related` id list → resolve those (admin
 *    choice), excluding the product itself.
 *  - Otherwise fall back to other products from the same category.
 * Hidden categories are off-limits throughout: their products never surface
 * here, and a product that lives in one gets a spread of the visible catalog
 * instead of its own (equally hidden) siblings.
 * Always capped to `limit` to keep the grid to a single row.
 */
export function computeRelated(categories, product, category, relatedIds, limit = 4) {
  const visible = visibleCategories(categories);

  if (Array.isArray(relatedIds) && relatedIds.length) {
    const manual = resolveIds(visible, relatedIds, { exclude: product.id }).slice(0, limit);
    if (manual.length) return manual;
    // All ids were stale or hidden → fall through to the defaults below.
  }

  if (isHiddenCategory(category)) {
    // One piece per visible collection — a way back into the main catalog.
    return visible
      .map((c) => {
        const p = listedProducts(c).find((x) => x.id !== product.id);
        return p ? withCategory(p, c) : null;
      })
      .filter(Boolean)
      .slice(0, limit);
  }

  return listedProducts(category)
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

/**
 * Move a set of products (by id) from one category to the end of another's
 * list — the admin's bulk "move to category" action. A product's id is
 * unique catalog-wide and never changes here, so nothing about the product
 * itself is touched, only which category array it lives in (i.e. its URL).
 *
 * Pure and a no-op (returns `categories` unchanged, same reference) if either
 * category is missing, the two slugs are the same, or `ids` matches nothing —
 * a stale target slug must never silently drop products from the catalog.
 */
export function moveProductsToCategory(categories, fromSlug, ids, toSlug) {
  const idSet = new Set(ids);
  const from = categories.find((c) => c.slug === fromSlug);
  const toExists = categories.some((c) => c.slug === toSlug);
  if (!from || !toExists || fromSlug === toSlug || idSet.size === 0) return categories;
  const moving = from.products.filter((p) => idSet.has(p.id));
  if (moving.length === 0) return categories;
  return categories.map((c) => {
    if (c.slug === fromSlug) return { ...c, products: c.products.filter((p) => !idSet.has(p.id)) };
    if (c.slug === toSlug) return { ...c, products: [...c.products, ...moving] };
    return c;
  });
}
