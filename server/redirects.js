// Legacy URL redirects.
//
// A product's address carries its section: /<category-slug>/<product-id>. So
// moving a product between sections in /admin — or merging whole sections, as
// the "Otros Modelos" consolidation did — changes the address of every product
// involved. The SPA already sends visitors on to the right page client-side
// (see src/pages/Product.jsx), but a crawler only ever sees the 404 the SPA
// fallback returns for a route that has no prerendered snapshot.
//
// resolveRedirect() turns those into real 301s off the live catalog, so it
// covers future moves too, not just the one that prompted it.

// Sections folded into "Otros Modelos" — their own pages no longer exist, so
// their old URLs point at the section that absorbed them.
export const MERGED_CATEGORIES = new Map([
  ['espejos', 'otros-modelos'],
  ['comodas', 'otros-modelos'],
  ['consolas-con-espejo', 'otros-modelos'],
  ['consolas', 'otros-modelos'],
  ['mesas-de-manicura', 'otros-modelos'],
]);

/** Map of product id → the slug of the category it currently lives in. */
export function buildProductIndex(categories) {
  const index = new Map();
  for (const c of categories ?? []) {
    for (const p of c.products ?? []) {
      if (p?.id) index.set(p.id, c.slug);
    }
  }
  return index;
}

/**
 * The canonical path for `pathname`, or null when it is already canonical (or
 * isn't a catalog URL at all). The `/en` prefix is preserved — both language
 * trees mirror the same slugs.
 */
export function resolveRedirect(pathname, productIndex) {
  const parts = pathname.split('/').filter(Boolean);
  const lang = parts[0] === 'en' ? ['en'] : [];
  const rest = parts.slice(lang.length);

  if (rest.length === 2 && rest[0] === 'categoria') {
    const legacySlug = rest[1];
    const canonicalSlug = MERGED_CATEGORIES.get(legacySlug) ?? legacySlug;
    return `/${[...lang, canonicalSlug].join('/')}`;
  }

  if (rest.length === 2 && rest[0] === 'producto') {
    const id = rest[1];
    const actual = productIndex?.get(id);
    return actual ? `/${[...lang, actual, id].join('/')}` : null;
  }

  if (rest.length === 1) {
    const merged = MERGED_CATEGORIES.get(rest[0]);
    return merged ? `/${[...lang, merged].join('/')}` : null;
  }

  if (rest.length === 2) {
    const [slug, id] = rest;
    const actual = productIndex?.get(id);
    return actual && actual !== slug ? `/${[...lang, actual, id].join('/')}` : null;
  }

  return null;
}
