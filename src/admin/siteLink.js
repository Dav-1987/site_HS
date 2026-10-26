import { CATALOG_SLUG, isOff, offProductTarget } from '../data/catalog.js';

/**
 * A product's address on the site and what to call the link to it, for the
 * admin's "open on the site" links (the card, the row menu, the row's ↗).
 *
 * A product switched off — itself or with its whole section — has no page any
 * more: the server 301s its address to a similar open section (see
 * offProductTarget, the one rule both read), so the label says where it lands
 * instead of promising the product.
 */
export function productSiteLink(categories, product, category) {
  const href = `/${category.slug}/${product.id}`;
  if (!isOff(product) && !isOff(category)) return { href, label: 'Открыть на сайте', live: true };
  const target = offProductTarget(categories, product);
  const section = target === CATALOG_SLUG ? null : categories.find((c) => c.slug === target);
  const where = section ? `в «${section.name?.es || section.slug}»` : 'в каталог';
  return { href, label: `Адрес на сайте (ведёт ${where})`, live: false };
}

/** Opens a site link in a new tab, the way the toolbar's «Открыть сайт» does. */
export function openSiteLink(link) {
  window.open(link.href, '_blank', 'noopener');
}
