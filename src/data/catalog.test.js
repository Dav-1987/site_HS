import { describe, it, expect } from 'vitest';
import {
  isInStock,
  productDiscount,
  productDisplayName,
  productFullName,
  productLabel,
  showsDiscountBadge,
  computeFeatured,
  computeRelated,
  resolveFeaturedCards,
  resolveImage,
  productImages,
  productMedia,
  isHiddenCategory,
  isListed,
  isTileEntryCategory,
  isOff,
  listedProducts,
  liveCatalog,
  visibilityOf,
  visibleCategories,
  OTHER_MODELS_SLUG,
  moveProductsToCategory,
  productPerkVariant,
  PERK_VARIANTS,
  DEFAULT_PERK_VARIANT,
} from './catalog.js';
import { translations } from '../i18n/translations.js';

// Small catalog fixture: cat(slug, ...productIds)
const cat = (slug, ...ids) => ({
  slug,
  name: { es: slug, en: slug },
  products: ids.map((id) => ({ id, name: id })),
});

describe('productLabel', () => {
  it('joins the bare type word with the dimensions that tell items apart', () => {
    expect(productLabel({ name: 'Espejo ', subtitle: '70 × 170 cm' })).toBe('Espejo 70 × 170 cm');
  });

  it('collapses the stray whitespace admin-entered names carry', () => {
    expect(productLabel({ name: '  Tocador  ', subtitle: ' T-20 ' })).toBe('Tocador T-20');
  });

  it('falls back to the name alone when there is no subtitle', () => {
    expect(productLabel({ name: 'Consola' })).toBe('Consola');
    expect(productLabel({})).toBe('');
    expect(productLabel(undefined)).toBe('');
  });
});

describe('product names in two languages', () => {
  const mirror = {
    name: 'Espejo | de pie blanco con iluminación LED',
    nameEn: 'Mirror | White freestanding design with LED lighting',
    subtitle: '70 × 175 cm',
  };

  it('shows the head of the name on a tile and the whole of it elsewhere', () => {
    expect(productDisplayName(mirror)).toBe('Espejo');
    expect(productFullName(mirror)).toBe('Espejo de pie blanco con iluminación LED');
  });

  it('answers in English when the page is English', () => {
    expect(productDisplayName(mirror, 'en')).toBe('Mirror');
    expect(productFullName(mirror, 'en')).toBe('Mirror White freestanding design with LED lighting');
    expect(productLabel(mirror, 'en')).toBe(
      'Mirror White freestanding design with LED lighting 70 × 175 cm',
    );
  });

  // The feeds, the order mail and analytics have one language and pass none.
  it('answers in Spanish when no language is asked for', () => {
    expect(productLabel(mirror)).toBe('Espejo de pie blanco con iluminación LED 70 × 175 cm');
  });

  it('falls back to Spanish for a product with no English name yet', () => {
    const untranslated = { name: 'Tocador ', subtitle: 'T-20' };
    expect(productFullName(untranslated, 'en')).toBe('Tocador');
    expect(productDisplayName(untranslated, 'en')).toBe('Tocador');
    expect(productFullName({ name: 'Consola', nameEn: '   ' }, 'en')).toBe('Consola');
  });
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

describe('showsDiscountBadge', () => {
  // The badge predates the switch, so anything but an explicit `false` keeps it.
  it('is on for a product with no switch set', () => {
    expect(showsDiscountBadge({})).toBe(true);
    expect(showsDiscountBadge(null)).toBe(true);
    expect(showsDiscountBadge({ showDiscountBadge: true })).toBe(true);
  });

  it('is off only when explicitly turned off', () => {
    expect(showsDiscountBadge({ showDiscountBadge: false })).toBe(false);
  });

  it('gates the badge without touching the struck-through price', () => {
    const sale = { price: 690, oldPrice: 790 };
    const noBadge = { ...sale, showDiscountBadge: false };
    expect(productDiscount(sale).badge).toBe(true);
    expect(productDiscount(noBadge).badge).toBe(false);
    // Still a sale — the price stays struck through and the percent is intact.
    expect(productDiscount(noBadge).onSale).toBe(true);
    expect(productDiscount(noBadge).oldPrice).toBe(790);
    expect(productDiscount(noBadge).percent).toBe(13);
  });

  it('never shows a badge on a product that is not on sale', () => {
    expect(productDiscount({ price: 700, showDiscountBadge: true }).badge).toBe(false);
  });
});

describe('isInStock', () => {
  // The catalog predates the field, so anything but an explicit `false` is a
  // product that can still be ordered — including every row saved before the
  // column existed.
  it('is true for a product with no switch set', () => {
    expect(isInStock({})).toBe(true);
    expect(isInStock(null)).toBe(true);
    expect(isInStock({ inStock: true })).toBe(true);
  });

  it('is false only when explicitly turned off', () => {
    expect(isInStock({ inStock: false })).toBe(false);
  });

  // Availability is a separate axis from visibility: running out must not take
  // the product off the site, or the page would lose its internal links and its
  // place in the listings for the duration.
  it('does not affect where the product is listed', () => {
    const soldOut = { id: 'p1', visibility: 'public', inStock: false };
    expect(isListed(soldOut)).toBe(true);
    expect(isOff(soldOut)).toBe(false);
    expect(listedProducts({ products: [soldOut] })).toEqual([soldOut]);
    expect(liveCatalog([{ slug: 'c', products: [soldOut] }])[0].products).toEqual([soldOut]);
  });

  // ...and neither does it touch the discount: the corner badge is swapped by
  // ProductBadge, while the struck-through old price stays as it was.
  it('leaves the discount calculation alone', () => {
    const d = productDiscount({ price: 690, oldPrice: 790, inStock: false });
    expect(d.onSale).toBe(true);
    expect(d.badge).toBe(true);
    expect(d.percent).toBe(13);
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

describe('productPerkVariant', () => {
  it('returns the variant the product selected', () => {
    expect(productPerkVariant({ perks: 'led' })).toBe('led');
    expect(productPerkVariant({ perks: 'quality' })).toBe('quality');
    expect(productPerkVariant({ perks: 'bulbs' })).toBe('bulbs');
  });

  // Products saved before the field existed have no `perks` at all — they must
  // keep showing the original strip rather than a missing translation key.
  it('falls back to the default for missing, empty or unknown values', () => {
    expect(productPerkVariant({})).toBe(DEFAULT_PERK_VARIANT);
    expect(productPerkVariant(null)).toBe(DEFAULT_PERK_VARIANT);
    expect(productPerkVariant({ perks: '' })).toBe(DEFAULT_PERK_VARIANT);
    expect(productPerkVariant({ perks: 'ledd' })).toBe(DEFAULT_PERK_VARIANT);
  });

  it('every variant has a translation in both languages', () => {
    for (const v of PERK_VARIANTS) {
      expect(translations.es[`order.perk.${v}`]).toBeTruthy();
      expect(translations.en[`order.perk.${v}`]).toBeTruthy();
    }
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
    {
      slug: 'c1',
      name: { es: 'C1', en: 'C1' },
      products: [{ id: 'p1', name: 'P1', images: ['ph1'] }],
    },
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

describe('hidden categories', () => {
  const hidden = cat(OTHER_MODELS_SLUG, 'h1', 'h2');
  const categories = [cat('c1', 'p1', 'p2'), cat('c2', 'p3'), hidden];

  it('flags the tile-entry section and filters it out of listings', () => {
    expect(isHiddenCategory(hidden)).toBe(true);
    expect(isHiddenCategory(categories[0])).toBe(false);
    expect(visibleCategories(categories).map((c) => c.slug)).toEqual(['c1', 'c2']);
  });

  // Its own tile is where it is surfaced, so it stays out of the category
  // listings whichever way its visibility switch is set — that switch governs
  // the tile (see OtherModelsCard), not a place in the grids.
  it('stays out of the listings whether it is public or unlisted', () => {
    expect(isTileEntryCategory(hidden)).toBe(true);
    expect(isTileEntryCategory(categories[0])).toBe(false);
    for (const visibility of ['public', 'unlisted']) {
      const withFlag = [...categories.slice(0, 2), { ...hidden, visibility }];
      expect(visibleCategories(withFlag).map((c) => c.slug)).toEqual(['c1', 'c2']);
    }
  });

  it('keeps hidden products out of a visible product’s related list', () => {
    const category = categories[0];
    const product = category.products[0]; // p1
    const out = computeRelated(categories, product, category, ['h1', 'p2']);
    expect(out.map((p) => p.id)).toEqual(['p2']);
  });

  it('falls back to the visible catalog for a product inside the hidden section', () => {
    const product = hidden.products[0]; // h1
    const out = computeRelated(categories, product, hidden, []);
    // One piece per visible collection — never a hidden sibling.
    expect(out.map((p) => p.id)).toEqual(['p1', 'p3']);
  });

  it('drops hidden ids from a hidden product’s explicit related list', () => {
    const product = hidden.products[0]; // h1
    const out = computeRelated(categories, product, hidden, ['h2', 'p3']);
    expect(out.map((p) => p.id)).toEqual(['p3']);
  });
});

describe('visibility', () => {
  // cat()/its products default to no `visibility` field at all — the "old data"
  // case, which must read as fully public.
  const plain = cat('c1', 'p1', 'p2');

  it('reads a missing or unknown value as public', () => {
    expect(visibilityOf(plain)).toBe('public');
    expect(visibilityOf({ visibility: 'nonsense' })).toBe('public');
    expect(visibilityOf(undefined)).toBe('public');
    expect(isListed(plain)).toBe(true);
    expect(isOff(plain)).toBe(false);
  });

  it('treats both unlisted and off as "not listed"', () => {
    expect(isListed({ visibility: 'unlisted' })).toBe(false);
    expect(isListed({ visibility: 'off' })).toBe(false);
    expect(isOff({ visibility: 'unlisted' })).toBe(false);
    expect(isOff({ visibility: 'off' })).toBe(true);
  });

  it('keeps unlisted and off categories out of the listings', () => {
    const categories = [
      plain,
      { ...cat('c2', 'p3'), visibility: 'unlisted' },
      { ...cat('c3', 'p4'), visibility: 'off' },
    ];
    expect(visibleCategories(categories).map((c) => c.slug)).toEqual(['c1']);
  });

  it('drops hidden products from a category listing', () => {
    const category = {
      ...plain,
      products: [
        { id: 'p1', name: 'p1' },
        { id: 'p2', name: 'p2', visibility: 'unlisted' },
        { id: 'p3', name: 'p3', visibility: 'off' },
      ],
    };
    expect(listedProducts(category).map((p) => p.id)).toEqual(['p1']);
  });

  describe('liveCatalog', () => {
    const categories = [
      {
        ...cat('c1'),
        products: [
          { id: 'p1', name: 'p1' },
          { id: 'p2', name: 'p2', visibility: 'off' },
        ],
      },
      { ...cat('c2', 'p3'), visibility: 'unlisted' },
      { ...cat('c3', 'p4'), visibility: 'off' },
    ];
    const live = liveCatalog(categories);

    it('removes off categories entirely and off products from the rest', () => {
      expect(live.map((c) => c.slug)).toEqual(['c1', 'c2']);
      expect(live[0].products.map((p) => p.id)).toEqual(['p1']);
    });

    it('keeps unlisted sections — their pages still work', () => {
      expect(live[1].slug).toBe('c2');
      expect(live[1].products.map((p) => p.id)).toEqual(['p3']);
    });

    it('returns a category with nothing to strip by reference', () => {
      const untouched = [cat('c1', 'p1')];
      expect(liveCatalog(untouched)[0]).toBe(untouched[0]);
    });
  });

  it('keeps a hidden product off the auto-curated Featured row', () => {
    const categories = [
      {
        ...cat('c1'),
        products: [
          { id: 'p1', name: 'p1', visibility: 'unlisted' },
          { id: 'p2', name: 'p2' },
        ],
      },
    ];
    expect(computeFeatured(categories, []).map((p) => p.id)).toEqual(['p2']);
  });

  it('skips a hidden product hand-picked for Featured', () => {
    const categories = [
      {
        ...cat('c1'),
        products: [
          { id: 'p1', name: 'p1', visibility: 'unlisted' },
          { id: 'p2', name: 'p2' },
        ],
      },
    ];
    expect(computeFeatured(categories, ['p1', 'p2']).map((p) => p.id)).toEqual(['p2']);
    expect(
      resolveFeaturedCards(categories, [{ productId: 'p1' }, { productId: 'p2' }]).map((p) => p.id),
    ).toEqual(['p2']);
  });

  it('keeps a hidden sibling out of the related row', () => {
    const category = {
      ...cat('c1'),
      products: [
        { id: 'p1', name: 'p1' },
        { id: 'p2', name: 'p2', visibility: 'unlisted' },
        { id: 'p3', name: 'p3' },
      ],
    };
    const categories = [category];
    const out = computeRelated(categories, category.products[0], category, []);
    expect(out.map((p) => p.id)).toEqual(['p3']);
  });
});

describe('moveProductsToCategory', () => {
  const categories = [cat('c1', 'p1', 'p2', 'p3'), cat('c2', 'p4')];

  it('moves the given ids to the end of the target category, preserving ids and order', () => {
    const out = moveProductsToCategory(categories, 'c1', ['p1', 'p3'], 'c2');
    expect(out.find((c) => c.slug === 'c1').products.map((p) => p.id)).toEqual(['p2']);
    expect(out.find((c) => c.slug === 'c2').products.map((p) => p.id)).toEqual(['p4', 'p1', 'p3']);
  });

  it('does not mutate the input array', () => {
    moveProductsToCategory(categories, 'c1', ['p1'], 'c2');
    expect(categories.find((c) => c.slug === 'c1').products.map((p) => p.id)).toEqual([
      'p1',
      'p2',
      'p3',
    ]);
  });

  it('is a same-reference no-op when the target category does not exist', () => {
    expect(moveProductsToCategory(categories, 'c1', ['p1'], 'ghost')).toBe(categories);
  });

  it('is a same-reference no-op for a stale/missing product id', () => {
    expect(moveProductsToCategory(categories, 'c1', ['ghost'], 'c2')).toBe(categories);
  });

  it('is a same-reference no-op when source and target are the same category', () => {
    expect(moveProductsToCategory(categories, 'c1', ['p1'], 'c1')).toBe(categories);
  });

  it('is a same-reference no-op for an empty id list', () => {
    expect(moveProductsToCategory(categories, 'c1', [], 'c2')).toBe(categories);
  });
});
