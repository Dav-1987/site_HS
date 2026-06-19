import { describe, it, expect } from 'vitest';
import {
  productDiscount,
  computeFeatured,
  computeRelated,
  resolveFeaturedCards,
  resolveImage,
  productImages,
  productMedia,
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

  it('resolves /uploads/ paths to the nearest WebP size variant', () => {
    expect(resolveImage('/uploads/abc.jpg', 200)).toBe('/uploads/abc_400.webp');
    expect(resolveImage('/uploads/abc.jpg', 700)).toBe('/uploads/abc_800.webp');
    expect(resolveImage('/uploads/abc.jpg', 1200)).toBe('/uploads/abc_1600.webp');
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

  it('derives photos (videos excluded) from the unified media list', () => {
    const product = {
      media: [
        { type: 'video', src: 'v1' },
        { type: 'image', src: 'a' },
        { type: 'image', src: 'b' },
      ],
    };
    expect(productImages(product)).toEqual(['a', 'b']);
  });
});

describe('productMedia', () => {
  it('returns the unified media list, normalized, in order', () => {
    const product = {
      media: [
        { type: 'image', src: 'a' },
        { type: 'video', src: 'v' },
        { type: 'bogus', src: 'b' },
        { type: 'video', src: '' },
        { src: 'c' },
      ],
    };
    expect(productMedia(product)).toEqual([
      { type: 'image', src: 'a' },
      { type: 'video', src: 'v' },
      { type: 'image', src: 'b' },
      { type: 'image', src: 'c' },
    ]);
  });

  it('synthesizes media from legacy images + video (video last by default)', () => {
    const product = { images: ['a', 'b'], video: 'v' };
    expect(productMedia(product)).toEqual([
      { type: 'image', src: 'a' },
      { type: 'image', src: 'b' },
      { type: 'video', src: 'v' },
    ]);
  });

  it('honors the legacy videoFirst flag', () => {
    const product = { images: ['a'], video: 'v', videoFirst: true };
    expect(productMedia(product)).toEqual([
      { type: 'video', src: 'v' },
      { type: 'image', src: 'a' },
    ]);
  });

  it('returns an empty array when nothing is set', () => {
    expect(productMedia({})).toEqual([]);
    expect(productMedia(null)).toEqual([]);
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

describe('resolveFeaturedCards', () => {
  const categories = [
    { slug: 'c1', name: { es: 'C1', en: 'C1' }, products: [{ id: 'p1', name: 'P1', images: ['ph1'] }] },
    { slug: 'c2', name: { es: 'C2', en: 'C2' }, products: [{ id: 'p2', name: 'P2' }] },
  ];

  it('resolves cards in order, attaching product, category, cover and video', () => {
    const out = resolveFeaturedCards(categories, [
      { productId: 'p2', cover: 'cov2', video: 'vid2' },
      { productId: 'p1', cover: '', video: '' },
    ]);
    expect(out.map((c) => c.id)).toEqual(['p2', 'p1']);
    expect(out[0].categorySlug).toBe('c2');
    expect(out[0].category).toEqual({ es: 'C2', en: 'C2' });
    expect(out[0].featuredCover).toBe('cov2');
    expect(out[0].featuredVideo).toBe('vid2');
  });

  it('falls back to the product first photo when no cover is set', () => {
    const out = resolveFeaturedCards(categories, [{ productId: 'p1' }]);
    expect(out[0].featuredCover).toBe('ph1');
    expect(out[0].featuredVideo).toBe('');
  });

  it('skips cards with missing/stale or invalid product ids', () => {
    const out = resolveFeaturedCards(categories, [
      { productId: 'ghost' },
      null,
      { cover: 'x' },
      { productId: 'p1' },
    ]);
    expect(out.map((c) => c.id)).toEqual(['p1']);
  });

  it('returns an empty array for non-array input', () => {
    expect(resolveFeaturedCards(categories, null)).toEqual([]);
    expect(resolveFeaturedCards(categories, undefined)).toEqual([]);
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
