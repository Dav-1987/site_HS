import { describe, it, expect } from 'vitest';
import {
  productDiscount,
  computeFeatured,
  computeRelated,
  resolveImage,
  productImages,
} from './catalog.js';

// Small catalog fixture: cat(slug, ...productIds)
const cat = (slug, ...ids) => ({
  slug,
  name: { es: slug, en: slug },
  products: ids.map((id) => ({ id, name: id })),
});

describe('productDiscount', () => {
  it('flags a sale when oldPrice > price and computes the percent', () => {
    const d = productDiscount({ price: 690, oldPrice: 790 });
    expect(d.onSale).toBe(true);
    expect(d.percent).toBe(13); // round((1 - 690/790) * 100) = 13
  });

  it('is not on sale when oldPrice <= price or is missing', () => {
    expect(productDiscount({ price: 700, oldPrice: 700 }).onSale).toBe(false);
    expect(productDiscount({ price: 700, oldPrice: 0 }).onSale).toBe(false);
    expect(productDiscount({ price: 700 }).onSale).toBe(false);
  });

  it('coerces missing/invalid prices to 0', () => {
    const d = productDiscount({});
    expect(d.price).toBe(0);
    expect(d.oldPrice).toBe(0);
    expect(d.onSale).toBe(false);
    expect(d.percent).toBe(0);
  });
});

describe('resolveImage', () => {
  it('returns null for empty input', () => {
    expect(resolveImage('')).toBeNull();
    expect(resolveImage(null)).toBeNull();
  });

  it('passes app-absolute paths through unchanged', () => {
    expect(resolveImage('/uploads/abc.jpg', 700)).toBe('/uploads/abc.jpg');
  });

  it('passes full URLs through unchanged', () => {
    const url = 'https://example.com/x.png';
    expect(resolveImage(url, 700)).toBe(url);
  });

  it('expands a bare Unsplash id token into a sized URL', () => {
    expect(resolveImage('abc123', 500)).toBe(
      'https://images.unsplash.com/photo-abc123?auto=format&fit=crop&w=500&q=80',
    );
  });
});

describe('productImages', () => {
  it('prefers the explicit images array', () => {
    expect(productImages({ images: ['a', 'b'], image: 'c' })).toEqual(['a', 'b']);
  });

  it('drops falsy entries', () => {
    expect(productImages({ images: ['a', '', null, 'b'] })).toEqual(['a', 'b']);
  });

  it('falls back to the single cover image', () => {
    expect(productImages({ image: 'cover' })).toEqual(['cover']);
  });

  it('returns an empty array when nothing is set', () => {
    expect(productImages({})).toEqual([]);
    expect(productImages(null)).toEqual([]);
  });
});

describe('computeFeatured', () => {
  const categories = [cat('c1', 'p1', 'p2'), cat('c2', 'p3')];

  it('resolves an explicit ordered id list and attaches category info', () => {
    const out = computeFeatured(categories, ['p3', 'p1']);
    expect(out.map((p) => p.id)).toEqual(['p3', 'p1']);
    expect(out[0].categorySlug).toBe('c2');
    expect(out[0].category).toEqual({ es: 'c2', en: 'c2' });
  });

  it('skips stale ids', () => {
    const out = computeFeatured(categories, ['ghost', 'p1']);
    expect(out.map((p) => p.id)).toEqual(['p1']);
  });

  it('auto-curates when no ids are given', () => {
    const out = computeFeatured(categories, []);
    expect(out.length).toBeGreaterThan(0);
  });
});

describe('computeRelated', () => {
  const categories = [cat('c1', 'p1', 'p2', 'p3')];
  const category = categories[0];
  const product = category.products[0]; // p1

  it('uses explicit related ids, excluding the product itself', () => {
    const out = computeRelated(categories, product, category, ['p1', 'p2']);
    expect(out.map((p) => p.id)).toEqual(['p2']);
  });

  it('falls back to other products in the same category', () => {
    const out = computeRelated(categories, product, category, []);
    expect(out.map((p) => p.id)).toEqual(['p2', 'p3']);
  });

  it('caps the result to the given limit', () => {
    const out = computeRelated(categories, product, category, [], 1);
    expect(out).toHaveLength(1);
  });
});
