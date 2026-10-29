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
//
// The same goes for what the owner switched off in /admin («Снять с сайта»):
// those pages have no snapshot either, and their links live on in search
// results, ChatGPT answers and old posts. Rather than a 404, a visitor is sent
// to an open section of the same kind of furniture, or to the catalogue.

import { CATALOG_SLUG, isOff, offProductTarget } from '../src/data/catalog.js';
import { GUIDES_SLUG } from '../src/data/guides.js';

// Sections folded into "Otros Modelos" — their own pages no longer exist, so
// their old URLs point at the section that absorbed them. A slug that is a
// section again (Espejos came back) is its own page, not a legacy one.
export const MERGED_CATEGORIES = new Map([
  ['espejos', 'otros-modelos'],
  ['comodas', 'otros-modelos'],
  ['consolas-con-espejo', 'otros-modelos'],
  ['consolas', 'otros-modelos'],
  ['mesas-de-manicura', 'otros-modelos'],
]);

/**
 * Everything resolveRedirect() needs from the catalog, built once per catalog:
 * - `products`: id → `{ slug, off }` — the section it lives in and, when it is
 *   switched off (itself or its whole section), the path to send its visitors
 *   to (offProductTarget, the rule the admin also names beside the link);
 * - `categories`: slug → `{ off }`, the same for a section's own page. A section
 *   whose products all go one way goes that way too; a mixed one, the catalogue.
 */
export function buildRedirectIndex(categories) {
  const list = (categories ?? []).filter((c) => c?.slug);
  const products = new Map();
  const sections = new Map();
  for (const c of list) {
    const items = (c.products ?? []).filter((p) => p?.id);
    const targets = new Map(items.map((p) => [p.id, offProductTarget(list, p)]));
    const kinds = new Set(targets.values());
    sections.set(c.slug, {
      off: isOff(c) ? (kinds.size === 1 ? [...kinds][0] : CATALOG_SLUG) : null,
    });
    for (const p of items) {
      products.set(p.id, { slug: c.slug, off: isOff(c) || isOff(p) ? targets.get(p.id) : null });
    }
  }
  return { products, categories: sections };
}

/**
 * The canonical path for `pathname`, or null when it is already canonical (or
 * isn't a catalog URL at all). The `/en` prefix is preserved — both language
 * trees mirror the same slugs.
 */
export function resolveRedirect(pathname, index) {
  const parts = pathname.split('/').filter(Boolean);
  const lang = parts[0] === 'en' ? ['en'] : [];
  const rest = parts.slice(lang.length);
  const to = (...segments) => `/${[...lang, ...segments].join('/')}`;

  // An article that has no page — a draft again, deleted, or never there —
  // sends its visitors to the section rather than a 404: its link may live on
  // in an AI answer. The section's own page is no catalog URL.
  if (rest[0] === GUIDES_SLUG) return rest.length > 1 ? to(GUIDES_SLUG) : null;

  const sectionPath = (slug) => {
    const section = index?.categories?.get(slug);
    if (section) return to(section.off ?? slug);
    const merged = MERGED_CATEGORIES.get(slug);
    if (!merged) return null;
    return index?.categories?.has(merged) ? sectionPath(merged) : to(merged);
  };
  const productPath = (id) => {
    const product = index?.products?.get(id);
    if (!product) return null;
    return product.off ? to(product.off) : to(product.slug, id);
  };
  // A path that resolves to itself needs no redirect.
  const unlessSame = (target) => (target === to(...rest) ? null : target);

  if (rest.length === 2 && rest[0] === 'categoria') return sectionPath(rest[1]);
  if (rest.length === 2 && rest[0] === 'producto') return productPath(rest[1]);
  if (rest.length === 1) return unlessSame(sectionPath(rest[0]));
  if (rest.length === 2) return unlessSame(productPath(rest[1]));
  return null;
}

/**
 * `target` with the query string of the request it answers. Without it the
 * utm tags and click ids (fbclid, gclid) a visitor arrived with are gone by the
 * time the landing page reads them, and the order is filed as a direct visit.
 */
export function withQuery(target, originalUrl) {
  const at = originalUrl.indexOf('?');
  return at === -1 ? target : `${target}${originalUrl.slice(at)}`;
}
