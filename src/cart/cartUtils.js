// Pure cart logic, shared by CartContext, the Cart page and tests. A cart is a
// plain array of `{ id, qty }` lines — product details (name, price, image) are
// resolved from the live catalog at render time, so nothing in localStorage
// can go stale when prices or names change in the admin.

import { findProduct, productDiscount } from '../data/catalog.js';

export const MAX_QTY = 99;
export const MAX_LINES = 50;

/** Coerce any input to a valid line quantity (integer, 1..MAX_QTY). */
export function clampQty(qty) {
  const n = Math.trunc(Number(qty));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, MAX_QTY);
}

/** Add `qty` units of a product; merges into the existing line if present. */
export function addItem(items, id, qty = 1) {
  const existing = items.find((l) => l.id === id);
  if (existing) {
    return items.map((l) => (l.id === id ? { ...l, qty: clampQty(l.qty + clampQty(qty)) } : l));
  }
  if (items.length >= MAX_LINES) return items;
  return [...items, { id, qty: clampQty(qty) }];
}

/** Set a line's quantity; anything below 1 removes the line. */
export function setItemQty(items, id, qty) {
  const n = Math.trunc(Number(qty));
  if (!Number.isFinite(n) || n < 1) return removeItem(items, id);
  return items.map((l) => (l.id === id ? { ...l, qty: clampQty(n) } : l));
}

export function removeItem(items, id) {
  return items.filter((l) => l.id !== id);
}

/** Total number of units across all lines (header badge). */
export function cartCount(items) {
  return items.reduce((sum, l) => sum + l.qty, 0);
}

/** Validate a value read from localStorage into a safe cart array. */
export function sanitizeCart(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const line of raw) {
    const id = line?.id;
    if (typeof id !== 'string' || !id || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, qty: clampQty(line.qty) });
    if (out.length >= MAX_LINES) break;
  }
  return out;
}

/**
 * Resolve cart lines against the live catalog into render-ready rows
 * `{ product, category, qty, lineTotal }`. Lines whose product no longer
 * exists in the catalog are silently skipped.
 */
export function cartLines(items, categories) {
  const out = [];
  for (const { id, qty } of items) {
    const found = findProduct(categories, id);
    if (!found) continue;
    const { price } = productDiscount(found.product);
    out.push({ ...found, qty, lineTotal: price * qty });
  }
  return out;
}

export function cartTotal(lines) {
  return lines.reduce((sum, l) => sum + l.lineTotal, 0);
}
