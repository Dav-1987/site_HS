import { describe, it, expect } from 'vitest';
import { productSchema } from './schema.js';

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
