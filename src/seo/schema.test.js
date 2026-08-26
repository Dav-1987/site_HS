import { describe, it, expect } from 'vitest';
import { productListSchema, productSchema } from './schema.js';

const category = {
  slug: 'tocadores',
  name: { es: 'Tocadores', en: 'Dressing tables' },
};

const product = {
  id: 'Tocador-M-01',
  name: 'Tocador',
  subtitle: '90 × 40 × 170 cm',
  price: 499,
  oldPrice: 690,
  material: { es: 'Melamina', en: 'Melamine' },
  size: '90 × 40 × 170 cm',
  reference: 'M-01',
  description: { es: 'Un tocador.', en: 'A dressing table.' },
  media: [{ type: 'image', src: '/uploads/a.jpg' }],
};

// The Offer is what Merchant Center compares the product feed against: a feed
// saying "out of stock" next to a page saying InStock is an availability
// mismatch, and with automatic item updates on, Google rewrites the feed from
// this markup. So availability has to follow the same admin switch the feed
// will read, not a constant.
describe('productSchema — availability', () => {
  it('is InStock for a product with the switch untouched', () => {
    expect(productSchema(product, category).offers.availability).toBe(
      'https://schema.org/InStock',
    );
  });

  it('is InStock when the switch is explicitly on', () => {
    expect(productSchema({ ...product, inStock: true }, category).offers.availability).toBe(
      'https://schema.org/InStock',
    );
  });

  it('is OutOfStock once the product is marked out of stock', () => {
    expect(productSchema({ ...product, inStock: false }, category).offers.availability).toBe(
      'https://schema.org/OutOfStock',
    );
  });

  // Out of stock is not a price change: the offer keeps its price so the item
  // stays a valid, re-enableable offer rather than dropping out of the feed.
  it('keeps the price and the rest of the offer intact', () => {
    const { offers } = productSchema({ ...product, inStock: false }, category);
    expect(offers.price).toBe(499);
    expect(offers.priceCurrency).toBe('EUR');
    expect(offers.url).toBe('https://hsmuebles.es/tocadores/Tocador-M-01');
  });

  it('has no offer at all for a product with no price', () => {
    expect(productSchema({ ...product, price: 0 }, category).offers).toBeUndefined();
  });
});

// A name may carry the bar that cuts the tile name from the full one. It is a
// display device and belongs in no output: markup carrying it hands Google a
// product called "Espejo | Hollywood…". Every schema builder that names a
// product goes through the helpers, and this is what says so.
describe('structured data never carries the display bar', () => {
  const named = {
    ...product,
    name: 'Tocador | de maquillaje con espejo y bombillas LED',
    nameEn: 'Dressing table | Makeup unit with mirror and LED bulbs',
  };

  it('keeps it out of a Product node, in either language', () => {
    expect(productSchema(named, category).name).toBe(
      'Tocador de maquillaje con espejo y bombillas LED 90 × 40 × 170 cm',
    );
    expect(productSchema(named, category, 'en').name).toBe(
      'Dressing table Makeup unit with mirror and LED bulbs 90 × 40 × 170 cm',
    );
  });

  it('keeps it out of a category ItemList', () => {
    const list = productListSchema([named], 'tocadores');
    expect(list.itemListElement[0].name).toBe('Tocador de maquillaje con espejo y bombillas LED');
    expect(productListSchema([named], 'tocadores', 'en').itemListElement[0].name).toBe(
      'Dressing table Makeup unit with mirror and LED bulbs',
    );
  });
});
