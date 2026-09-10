import { describe, it, expect } from 'vitest';
import { productContentEqual, extractUploadKeys, DEFAULT_PERK_VARIANT } from './store.js';

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

describe('productContentEqual — bulbs badge switch', () => {
  // Three-state, so "never touched" has to compare equal to the null a row
  // written before the column reads back as — otherwise every save would bump
  // every product's updated_at and defeat the comparison.
  it('treats an untouched switch as equal to an explicit null', () => {
    expect(productContentEqual(base, { ...base, showBulbsBadge: null })).toBe(true);
  });

  it('detects an answer being given either way', () => {
    expect(productContentEqual(base, { ...base, showBulbsBadge: true })).toBe(false);
    expect(productContentEqual(base, { ...base, showBulbsBadge: false })).toBe(false);
    expect(
      productContentEqual({ ...base, showBulbsBadge: true }, { ...base, showBulbsBadge: false }),
    ).toBe(false);
  });
});

// Availability has to bump updated_at like any other content change: the flag
// changes the page's Offer, so the prerendered HTML and the sitemap's <lastmod>
// both go stale until the next rebuild.
describe('productContentEqual — stock', () => {
  it('treats an untouched flag as equal to an explicit true (legacy row)', () => {
    expect(productContentEqual(base, { ...base, inStock: true })).toBe(true);
  });

  it('detects a product going out of stock', () => {
    expect(productContentEqual(base, { ...base, inStock: false })).toBe(false);
  });

  it('detects a product coming back in stock', () => {
    const soldOut = { ...base, inStock: false };
    expect(productContentEqual(soldOut, { ...soldOut, inStock: true })).toBe(false);
    expect(productContentEqual(soldOut, { ...soldOut })).toBe(true);
  });
});

describe('productContentEqual — gift', () => {
  const gift = { mode: 'own', source: 'catalog', productId: 'Estanteria-E-03' };

  it('treats a product with no gift as unchanged', () => {
    expect(productContentEqual(base, { ...base, gift: {} })).toBe(true);
  });

  it('sees a gift being added', () => {
    expect(productContentEqual(base, { ...base, gift })).toBe(false);
  });

  it('sees the gift being pointed at another product', () => {
    const moved = { ...gift, productId: 'Espejo-F-05' };
    expect(productContentEqual({ ...base, gift }, { ...base, gift: moved })).toBe(false);
  });

  it('sees the price switch being turned off', () => {
    const quiet = { ...gift, showPrice: false };
    expect(productContentEqual({ ...base, gift }, { ...base, gift: quiet })).toBe(false);
  });

  // Сколько штук дарим — такое же поле подарка, как остальные: изменилось —
  // товар изменился.
  it('sees the mark on the photo being given its own crop', () => {
    const cropped = { ...gift, badgeImage: '/uploads/closeup.jpg' };
    expect(productContentEqual({ ...base, gift }, { ...base, gift: cropped })).toBe(false);
  });

  it('sees the count of the gift being raised', () => {
    const two = { ...gift, qty: 2 };
    expect(productContentEqual({ ...base, gift }, { ...base, gift: two })).toBe(false);
  });

  // Единица и пусто — одно и то же, и ключа за собой не оставляют: иначе
  // каждый уже сохранённый подарок выглядел бы отредактированным.
  it('reads an explicit one as no count at all', () => {
    const one = { ...gift, qty: 1 };
    expect(productContentEqual({ ...base, gift }, { ...base, gift: one })).toBe(true);
  });

  it('ignores a count that is not a whole number above one', () => {
    const nonsense = { ...gift, qty: 'dos' };
    expect(productContentEqual({ ...base, gift }, { ...base, gift: nonsense })).toBe(true);
  });

  // Same reason as the media regression above: `gift` is jsonb, so the object
  // read back from Postgres carries its keys shortest-first, not in the order
  // it was written. Compared by stringify, every product with a gift would look
  // changed on every save.
  it('ignores the key order Postgres hands the object back in', () => {
    const reordered = { source: 'catalog', mode: 'own', productId: 'Estanteria-E-03' };
    expect(productContentEqual({ ...base, gift }, { ...base, gift: reordered })).toBe(true);
  });

  it('ignores fields that are not part of a gift', () => {
    const noisy = { ...gift, injected: 'drop me' };
    expect(productContentEqual({ ...base, gift }, { ...base, gift: noisy })).toBe(true);
  });

  it('ignores an unknown mode, which reads as the default', () => {
    const bogus = { ...gift, mode: 'sometimes' };
    expect(productContentEqual({ ...base, gift: { source: 'catalog', productId: 'Estanteria-E-03' } }, { ...base, gift: bogus })).toBe(true);
  });

  // The gallery and the price a gift outside the catalog carries. Both are new
  // keys in a whitelist, and a whitelist that has not been told about a field
  // drops it on save without saying so — these are the tests that would have
  // caught that, and the ones below say the comparison learned them too.
  const custom = {
    mode: 'own',
    source: 'custom',
    name: { es: 'Funda', en: 'Cover' },
    images: ['/uploads/a.jpg', '/uploads/b.jpg'],
    price: 35,
  };

  it('sees a photo added to the gift', () => {
    const more = { ...custom, images: [...custom.images, '/uploads/c.jpg'] };
    expect(productContentEqual({ ...base, gift: custom }, { ...base, gift: more })).toBe(false);
  });

  it('sees the photos reordered — the first one is the inset', () => {
    const swapped = { ...custom, images: ['/uploads/b.jpg', '/uploads/a.jpg'] };
    expect(productContentEqual({ ...base, gift: custom }, { ...base, gift: swapped })).toBe(false);
  });

  it('sees the price being changed', () => {
    expect(
      productContentEqual({ ...base, gift: custom }, { ...base, gift: { ...custom, price: 40 } }),
    ).toBe(false);
  });

  it('reads a blank price as no price at all', () => {
    const blank = { ...custom, price: '' };
    const absent = { ...custom, price: undefined };
    expect(productContentEqual({ ...base, gift: blank }, { ...base, gift: absent })).toBe(true);
  });

  it('drops empty and duplicate photos rather than storing them', () => {
    const messy = { ...custom, images: ['/uploads/a.jpg', '', '/uploads/a.jpg', '/uploads/b.jpg'] };
    expect(productContentEqual({ ...base, gift: custom }, { ...base, gift: messy })).toBe(true);
  });
});

// What the upload sweep keeps. A file missing from this set counts as an
// orphan and is deleted about two days later, so every place the catalog can
// point at an upload has to be listed — gift photos were not, and the sweep
// took them.
describe('extractUploadKeys — gift photos', () => {
  const gift = {
    mode: 'own',
    source: 'custom',
    image: '/uploads/cover.jpg',
    images: ['/uploads/cover.jpg', '/uploads/side.jpg', '/uploads/detail.jpg'],
    badgeImage: '/uploads/mark.png',
  };

  it('keeps every photo of a gift set on a product', () => {
    const keys = extractUploadKeys([{ slug: 'tocadores', products: [{ ...base, gift }] }]);
    for (const k of ['cover.jpg', 'side.jpg', 'detail.jpg', 'mark.png'])
      expect(keys.has(k)).toBe(true);
  });

  it('keeps the photos of a category rule too', () => {
    const keys = extractUploadKeys([{ slug: 'tocadores', gift, products: [] }]);
    for (const k of ['cover.jpg', 'side.jpg', 'detail.jpg', 'mark.png'])
      expect(keys.has(k)).toBe(true);
  });

  // A catalog gift has no gallery of its own, but the crop for the mark is
  // still an upload of its own.
  it('keeps the mark of a gift taken from the catalog', () => {
    const fromCatalog = {
      mode: 'own',
      source: 'catalog',
      productId: 'E-02',
      badgeImage: '/uploads/two.png',
    };
    const keys = extractUploadKeys([
      { slug: 'tocadores', products: [{ ...base, gift: fromCatalog }] },
    ]);
    expect(keys.has('two.png')).toBe(true);
  });

  it('ignores a product without a gift and links that are not uploads', () => {
    const external = {
      ...gift,
      images: ['https://images.unsplash.com/x.jpg'],
      image: '',
      badgeImage: '',
    };
    const keys = extractUploadKeys([
      { slug: 'a', products: [{ ...base }, { ...base, gift: external }] },
    ]);
    expect([...keys]).toEqual(['a.jpg']);
  });
});
