// What the catalog section lists: a category or the whole catalog, narrowed by
// a search and by filters. Pure, so the counts next to the filters and the rows
// under them can't disagree.

import { isInStock, isListed, productDiscount, productImages } from '../data/catalog.js';

/**
 * The filters, in the order they are offered. A row must pass every one on.
 * `test(product, category)`: «На сайте» needs the section too — a product
 * shown in a section that is switched off or hidden is still not in the shop.
 */
export const CATALOG_FILTERS = Object.freeze([
  {
    key: 'live',
    label: 'На сайте',
    title: 'Товары, которые покупатель видит в каталоге: и товар, и его раздел показываются',
    test: (p, c) => isListed(p) && isListed(c),
  },
  { key: 'hidden', label: 'Скрытые', test: (p) => !isListed(p) },
  { key: 'out', label: 'Нет в наличии', test: (p) => !isInStock(p) },
  { key: 'onephoto', label: 'Одно фото', test: (p) => productImages(p).length <= 1 },
  { key: 'nosale', label: 'Без скидки', test: (p) => !productDiscount(p).onSale },
]);

/** Lower case, accents off, spaces collapsed: "Estantería" finds "estanteria". */
export function normalizeSearch(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * True when every word of the query is in the product's name (either
 * language), reference or id — so "l-06" and "doble cajonera" both find
 * "Tocador | Hollywood Blanco con Doble Cajonera" (L-06).
 */
export function matchesSearch(product, query) {
  const words = normalizeSearch(query).split(' ').filter(Boolean);
  if (!words.length) return true;
  const haystack = normalizeSearch(
    [product.name, product.nameEn, product.reference, product.id].filter(Boolean).join(' '),
  );
  return words.every((w) => haystack.includes(w));
}

/**
 * The rows to list, in catalog order, as `{ product, category }`. A search
 * looks through the whole catalog whatever the category: the owner types an
 * article number without remembering which section it is in.
 */
export function catalogRows(categories, { slug = '', query = '', filters = [] } = {}) {
  const active = CATALOG_FILTERS.filter((f) => filters.includes(f.key));
  const searching = Boolean(normalizeSearch(query));
  return categories
    .filter((c) => searching || !slug || c.slug === slug)
    .flatMap((category) =>
      category.products
        .filter((p) => matchesSearch(p, query) && active.every((f) => f.test(p, category)))
        .map((product) => ({ product, category })),
    );
}

/** How many of the listed products each filter would leave, before filtering. */
export function filterCounts(categories, { slug = '', query = '' } = {}) {
  const rows = catalogRows(categories, { slug, query });
  return Object.fromEntries(
    CATALOG_FILTERS.map((f) => [
      f.key,
      rows.filter(({ product, category }) => f.test(product, category)).length,
    ]),
  );
}
