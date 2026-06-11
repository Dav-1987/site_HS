// Product ids and category slugs end up in page URLs (/<categorySlug>/<productId>).
// Spaces or special characters there produce fragile "%20"-links that break when
// shared, so the admin inputs are sanitized as the user types.

/** Paths owned by app routes — a category with such a slug would be unreachable. */
export const RESERVED_SLUGS = ['admin', 'catalogo', 'categoria', 'contacto', 'producto'];

/**
 * Make a value safe to use as a URL segment: strip accents (á→a, ñ→n),
 * turn spaces/underscores into hyphens, drop everything else non [A-Za-z0-9-].
 * Case is preserved unless `lower` is set (existing product ids are uppercase).
 */
export function urlSafe(value, { lower = false } = {}) {
  let v = String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  if (lower) v = v.toLowerCase();
  return v
    .replace(/[\s_]+/g, '-')
    .replace(/[^A-Za-z0-9-]/g, '')
    .replace(/-{2,}/g, '-');
}
