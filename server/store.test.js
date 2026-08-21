import { describe, it, expect } from 'vitest';
import { productContentEqual, DEFAULT_PERK_VARIANT } from './store.js';

const base = {
  name: 'Tocador',
  price: 499,
  oldPrice: 0,
  image: '/uploads/a.jpg',
  imageMobile: '',
  images: ['/uploads/a.jpg'],
  media: [{ type: 'image', src: '/uploads/a.jpg' }],
  material: { es: 'Melamina', en: 'Melamine' },
  size: '90 × 40 × 170 cm',
  reference: 'M-01',
  subtitle: '',
  description: { es: '', en: '' },
  related: [],
};

describe('productContentEqual', () => {
  it('treats identical products as equal', () => {
    expect(productContentEqual(base, { ...base })).toBe(true);
  });

  // Regression test: Postgres jsonb does not preserve object key order (it
  // returns object keys shortest-first), so a product read back from the DB
  // has its media items as { src, type } even though normalizeMedia() always
  // builds { type, src }. A plain JSON.stringify comparison saw these as
  // different and bumped updated_at on every save for every product with
  // media — i.e. always, since virtually every product has media.
  it('ignores media object key order (Postgres jsonb round-trip)', () => {
    const fromDb = { ...base, media: [{ src: '/uploads/a.jpg', type: 'image' }] };
    expect(productContentEqual(base, fromDb)).toBe(true);
  });

  it('still detects a real media change (different src)', () => {
    const changed = { ...base, media: [{ type: 'image', src: '/uploads/b.jpg' }] };
    expect(productContentEqual(base, changed)).toBe(false);
  });

  it('still detects a real media change (reordered gallery)', () => {
    const twoPhotos = {
      ...base,
      media: [
        { type: 'image', src: '/uploads/a.jpg' },
        { type: 'image', src: '/uploads/b.jpg' },
      ],
    };
    const reordered = {
      ...base,
      media: [
        { type: 'image', src: '/uploads/b.jpg' },
        { type: 'image', src: '/uploads/a.jpg' },
      ],
    };
    expect(productContentEqual(twoPhotos, reordered)).toBe(false);
  });

  it('still detects a real media change (different item count)', () => {
    const one = base;
    const two = {
      ...base,
      media: [...base.media, { type: 'video', src: '/uploads/v.mp4' }],
    };
    expect(productContentEqual(one, two)).toBe(false);
  });

  it('detects an unrelated field change (price)', () => {
    expect(productContentEqual(base, { ...base, price: 599 })).toBe(false);
  });

  it('detects a perk-variant change', () => {
    expect(productContentEqual({ ...base, perks: 'bulbs' }, { ...base, perks: 'led' })).toBe(false);
  });

  // A product saved without a variant has none at all, while the same product
  // read back from the DB carries the column default. Both mean the same strip,
  // so this must not count as a content change — otherwise such a product's
  // updated_at would be bumped on every save.
  it('treats a missing perk variant as the default', () => {
    expect(productContentEqual(base, { ...base, perks: DEFAULT_PERK_VARIANT })).toBe(true);
    expect(
      productContentEqual({ ...base, perks: '' }, { ...base, perks: DEFAULT_PERK_VARIANT }),
    ).toBe(true);
  });

  it('is false when either side is missing', () => {
    expect(productContentEqual(base, null)).toBe(false);
    expect(productContentEqual(undefined, base)).toBe(false);
  });
});

describe('productContentEqual — visibility', () => {
  it('treats a missing visibility as public', () => {
    expect(productContentEqual(base, { ...base, visibility: 'public' })).toBe(true);
    expect(productContentEqual(base, { ...base, visibility: 'nonsense' })).toBe(true);
  });

  // Hiding a product is a content change: the sitemap's <lastmod> for its page
  // should move, and the row must not keep the old timestamp.
  it('detects a change of visibility', () => {
    expect(productContentEqual(base, { ...base, visibility: 'unlisted' })).toBe(false);
    expect(
      productContentEqual({ ...base, visibility: 'unlisted' }, { ...base, visibility: 'off' }),
    ).toBe(false);
  });
});

describe('productContentEqual — sale badge switch', () => {
  it('treats a missing switch as on', () => {
    expect(productContentEqual(base, { ...base, showDiscountBadge: true })).toBe(true);
  });

  it('detects the switch being turned off', () => {
    expect(productContentEqual(base, { ...base, showDiscountBadge: false })).toBe(false);
  });
});
