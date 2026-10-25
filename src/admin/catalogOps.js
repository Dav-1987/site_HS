// Pure edits of the catalog — an array of categories — for the admin editor
// (useCatalogEditor.js holds the state and applies them).
//
// Products are found by their id and categories by their slug, both unique
// catalog-wide, never by their place in a list. An upload lands seconds after
// its file was picked, and by then the list on screen may have been reordered,
// filtered, searched or had products moved between categories (see update.js).
// When nothing matches — the product was deleted meanwhile — each function
// hands back the same array: the late change is dropped rather than given to
// whatever now sits where the product used to be.

import { DEFAULT_VISIBILITY } from '../data/catalog.js';
import { RESERVED_SLUGS } from './urlSafe.js';
import { applyUpdate } from './update.js';

/** Where a product lives: `{ ci, pi }` indexes, or null. */
export function locateProduct(categories, id) {
  for (let ci = 0; ci < categories.length; ci++) {
    const pi = categories[ci].products.findIndex((p) => p.id === id);
    if (pi >= 0) return { ci, pi };
  }
  return null;
}

function withProducts(categories, ci, products) {
  return categories.map((c, i) => (i === ci ? { ...c, products } : c));
}

/** Applies `next` (a value or an updater) to the product with this id. */
export function updateProduct(categories, id, next) {
  const at = locateProduct(categories, id);
  if (!at) return categories;
  const { products } = categories[at.ci];
  return withProducts(
    categories,
    at.ci,
    products.map((p, i) => (i === at.pi ? applyUpdate(next, p) : p)),
  );
}

/** Applies `next` (a value or an updater) to the category with this slug. */
export function updateCategory(categories, slug, next) {
  const ci = categories.findIndex((c) => c.slug === slug);
  if (ci < 0) return categories;
  return categories.map((c, i) => (i === ci ? applyUpdate(next, c) : c));
}

// A suffix no two clicks share. The time keeps tabs and sessions apart; within
// this one the counter does, since the time repeats within a millisecond and
// three random characters alone collided in ~2% of 50-id runs.
let sequence = 0;
const uniqueSuffix = () =>
  `${Date.now().toString(36)}${(sequence++).toString(36)}${Math.random().toString(36).slice(2, 4)}`;

/** A blank product for a category, with a provisional id the owner then renames. */
export function newProduct(slug) {
  return {
    id: `${slug || 'item'}-${uniqueSuffix()}`,
    name: '',
    price: 0,
    oldPrice: 0,
    image: '',
    imageMobile: '',
    images: [],
    material: { es: '', en: '' },
    size: '',
    visibility: DEFAULT_VISIBILITY,
    showDiscountBadge: true,
    inStock: true,
  };
}

/** Appends a product to the end of a category. */
export function addProduct(categories, slug, product) {
  const ci = categories.findIndex((c) => c.slug === slug);
  if (ci < 0) return categories;
  return withProducts(categories, ci, [...categories[ci].products, product]);
}

/** A copy of a product, with an id of its own. */
export function copyOfProduct(product) {
  return { ...product, id: `${product.id}-copy-${uniqueSuffix()}` };
}

/** Puts `product` right after the product with id `afterId`. */
export function insertProductAfter(categories, afterId, product) {
  const at = locateProduct(categories, afterId);
  if (!at) return categories;
  const products = [...categories[at.ci].products];
  products.splice(at.pi + 1, 0, product);
  return withProducts(categories, at.ci, products);
}

export function removeProduct(categories, id) {
  const at = locateProduct(categories, id);
  if (!at) return categories;
  return withProducts(
    categories,
    at.ci,
    categories[at.ci].products.filter((_, i) => i !== at.pi),
  );
}

/**
 * Applies `next` (a value or an updater) to every product with one of these
 * ids, wherever it lives — the admin's bulk actions on a selection, which may
 * span categories when it was made in «Все» or a search. Categories with none
 * of them are handed back as they were.
 */
export function updateProducts(categories, ids, next) {
  const wanted = new Set(ids);
  if (wanted.size === 0) return categories;
  return categories.map((c) =>
    c.products.some((p) => wanted.has(p.id))
      ? { ...c, products: c.products.map((p) => (wanted.has(p.id) ? applyUpdate(next, p) : p)) }
      : c,
  );
}

/** Removes every product with one of these ids, from whichever category. */
export function removeProducts(categories, ids) {
  const wanted = new Set(ids);
  if (wanted.size === 0) return categories;
  return categories.map((c) =>
    c.products.some((p) => wanted.has(p.id))
      ? { ...c, products: c.products.filter((p) => !wanted.has(p.id)) }
      : c,
  );
}

/** Moves a product to `toIndex` within its own category (clamped to the ends). */
export function moveProduct(categories, id, toIndex) {
  const at = locateProduct(categories, id);
  if (!at) return categories;
  const products = [...categories[at.ci].products];
  const target = Math.max(0, Math.min(products.length - 1, toIndex));
  if (target === at.pi) return categories;
  const [moving] = products.splice(at.pi, 1);
  products.splice(target, 0, moving);
  return withProducts(categories, at.ci, products);
}

/**
 * Moves products, from whichever categories they are in, to the end of
 * `toSlug`, keeping their catalog order. The admin's bulk "move to category" —
 * the selection may span categories when it was made in «Все» or a search.
 * A product id is unique and unchanged, so only its address changes (and the
 * server 301s the old one, see server/redirects.js).
 */
export function moveProductsTo(categories, ids, toSlug) {
  const wanted = new Set(ids);
  const target = categories.find((c) => c.slug === toSlug);
  if (!target || wanted.size === 0) return categories;
  const moving = categories
    .filter((c) => c.slug !== toSlug)
    .flatMap((c) => c.products.filter((p) => wanted.has(p.id)));
  if (moving.length === 0) return categories;
  const moved = new Set(moving.map((p) => p.id));
  return categories.map((c) => {
    if (c.slug === toSlug) return { ...c, products: [...c.products, ...moving] };
    if (!c.products.some((p) => moved.has(p.id))) return c;
    return { ...c, products: c.products.filter((p) => !moved.has(p.id)) };
  });
}

/** Why `newId` can't be this product's id, or '' when it can. */
export function productIdError(categories, oldId, newId) {
  if (!newId) return 'ID не может быть пустым';
  if (newId !== oldId && locateProduct(categories, newId)) {
    return 'Такой ID уже есть у другого товара';
  }
  return '';
}

// Other products point at a product by id: their «Похожие» picks, and a gift
// that is a product from the catalog (on a product or on a whole category).
const renameInGift = (gift, oldId, newId) =>
  gift?.productId === oldId ? { ...gift, productId: newId } : gift;

/**
 * Renames a product and everything in the catalog that points at it, so a new
 * id never leaves a «Похожие» list or a gift aimed at a product that no longer
 * exists. The «Избранное» cards live in the settings — see useCatalogEditor.
 */
export function renameProduct(categories, oldId, newId) {
  if (oldId === newId || productIdError(categories, oldId, newId)) return categories;
  if (!locateProduct(categories, oldId)) return categories;
  return categories.map((c) => ({
    ...c,
    gift: renameInGift(c.gift, oldId, newId),
    products: c.products.map((p) => ({
      ...p,
      id: p.id === oldId ? newId : p.id,
      gift: renameInGift(p.gift, oldId, newId),
      ...(Array.isArray(p.related) && p.related.includes(oldId)
        ? { related: p.related.map((r) => (r === oldId ? newId : r)) }
        : {}),
    })),
  }));
}

/** Why `newSlug` can't be this category's address, or '' when it can. */
export function categorySlugError(categories, oldSlug, newSlug) {
  if (!newSlug) return 'Адрес не может быть пустым';
  if (RESERVED_SLUGS.includes(newSlug)) {
    return 'Этот адрес занят системной страницей сайта';
  }
  if (newSlug !== oldSlug && categories.some((c) => c.slug === newSlug)) {
    return 'Такой адрес уже есть у другой категории';
  }
  return '';
}

export function renameCategory(categories, oldSlug, newSlug) {
  if (oldSlug === newSlug || categorySlugError(categories, oldSlug, newSlug)) return categories;
  return updateCategory(categories, oldSlug, (c) => ({ ...c, slug: newSlug }));
}

/** A blank category, with a provisional address no other category has. */
export function newCategory(categories) {
  let n = categories.length + 1;
  while (categories.some((c) => c.slug === `nueva-categoria-${n}`)) n++;
  return {
    slug: `nueva-categoria-${n}`,
    name: { es: 'Nueva categoría', en: 'New category' },
    tagline: { es: '', en: '' },
    description: { es: '', en: '' },
    image: '',
    imageMobile: '',
    visibility: DEFAULT_VISIBILITY,
    products: [],
  };
}

/** A copy of a category and its products, all with addresses of their own. */
export function copyOfCategory(category) {
  const suffix = uniqueSuffix();
  return {
    ...category,
    slug: `${category.slug}-copy-${suffix}`,
    products: category.products.map((p) => ({ ...p, id: `${p.id}-copy-${suffix}` })),
  };
}

export function removeCategory(categories, slug) {
  const next = categories.filter((c) => c.slug !== slug);
  return next.length === categories.length ? categories : next;
}

/** Moves a category one place earlier (-1) or later (+1). */
export function moveCategory(categories, slug, dir) {
  const ci = categories.findIndex((c) => c.slug === slug);
  const target = ci + dir;
  if (ci < 0 || target < 0 || target >= categories.length) return categories;
  const next = [...categories];
  [next[ci], next[target]] = [next[target], next[ci]];
  return next;
}
