import { describe, it, expect } from 'vitest';
import {
  MAX_QTY,
  MAX_LINES,
  clampQty,
  addItem,
  setItemQty,
  removeItem,
  cartCount,
  sanitizeCart,
  cartLines,
  cartTotal,
} from './cartUtils.js';

const catalog = [
  {
    slug: 'tocadores',
    name: { es: 'Tocadores', en: 'Vanities' },
    products: [
      { id: 'p1', name: 'Aria', price: 450 },
      { id: 'p2', name: 'Luna', price: 300, oldPrice: 400 },
    ],
  },
];

describe('clampQty', () => {
  it('coerces invalid values to 1', () => {
    expect(clampQty(0)).toBe(1);
    expect(clampQty(-5)).toBe(1);
    expect(clampQty('abc')).toBe(1);
    expect(clampQty(null)).toBe(1);
  });

  it('truncates and caps at MAX_QTY', () => {
    expect(clampQty(2.9)).toBe(2);
    expect(clampQty(1000)).toBe(MAX_QTY);
  });
});

describe('addItem', () => {
  it('appends a new line with qty 1 by default', () => {
    expect(addItem([], 'p1')).toEqual([{ id: 'p1', qty: 1 }]);
  });

  it('merges into an existing line', () => {
    const items = addItem(addItem([], 'p1', 2), 'p1', 3);
    expect(items).toEqual([{ id: 'p1', qty: 5 }]);
  });

  it('caps merged quantity at MAX_QTY', () => {
    const items = addItem([{ id: 'p1', qty: 98 }], 'p1', 10);
    expect(items[0].qty).toBe(MAX_QTY);
  });

  it('ignores new lines past MAX_LINES', () => {
    const full = Array.from({ length: MAX_LINES }, (_, i) => ({ id: `x${i}`, qty: 1 }));
    expect(addItem(full, 'overflow')).toHaveLength(MAX_LINES);
  });
});

describe('setItemQty / removeItem', () => {
  it('updates the quantity of a line', () => {
    expect(setItemQty([{ id: 'p1', qty: 1 }], 'p1', 4)).toEqual([{ id: 'p1', qty: 4 }]);
  });

  it('removes the line when qty drops below 1', () => {
    expect(setItemQty([{ id: 'p1', qty: 1 }], 'p1', 0)).toEqual([]);
  });

  it('removes only the matching line', () => {
    const items = [
      { id: 'p1', qty: 1 },
      { id: 'p2', qty: 2 },
    ];
    expect(removeItem(items, 'p1')).toEqual([{ id: 'p2', qty: 2 }]);
  });
});

describe('cartCount', () => {
  it('sums units across lines', () => {
    expect(
      cartCount([
        { id: 'p1', qty: 2 },
        { id: 'p2', qty: 3 },
      ]),
    ).toBe(5);
  });
});

describe('sanitizeCart', () => {
  it('returns [] for non-arrays', () => {
    expect(sanitizeCart(null)).toEqual([]);
    expect(sanitizeCart('junk')).toEqual([]);
    expect(sanitizeCart({})).toEqual([]);
  });

  it('drops malformed lines, dedupes ids and clamps quantities', () => {
    const raw = [
      { id: 'p1', qty: 2 },
      { id: 'p1', qty: 9 }, // duplicate
      { qty: 3 }, // no id
      { id: 42, qty: 1 }, // non-string id
      { id: 'p2', qty: -1 }, // bad qty
    ];
    expect(sanitizeCart(raw)).toEqual([
      { id: 'p1', qty: 2 },
      { id: 'p2', qty: 1 },
    ]);
  });
});

describe('cartLines / cartTotal', () => {
  it('resolves products, uses the discounted price and skips stale ids', () => {
    const lines = cartLines(
      [
        { id: 'p1', qty: 2 },
        { id: 'p2', qty: 1 },
        { id: 'deleted', qty: 1 },
      ],
      catalog,
    );
    expect(lines).toHaveLength(2);
    expect(lines[0].lineTotal).toBe(900); // 2 × 450
    expect(lines[1].lineTotal).toBe(300); // discounted price, not oldPrice
    expect(cartTotal(lines)).toBe(1200);
  });
});
