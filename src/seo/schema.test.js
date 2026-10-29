import { describe, it, expect } from 'vitest';
import {
  articleSchema,
  faqSchema,
  guideListSchema,
  productListSchema,
  productSchema,
} from './schema.js';

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
    expect(productSchema(product, category).offers.availability).toBe('https://schema.org/InStock');
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

// Google Shopping and ChatGPT take delivery and returns from the Offer itself,
// not from the /envios and /devoluciones pages; these are the terms those pages
// state, and the owner confirmed on 2026-10-26.
describe('productSchema — delivery and returns', () => {
  it('delivers in Spain only, for 35 €, within 3–5 days', () => {
    expect(productSchema(product, category).offers.shippingDetails).toEqual({
      '@type': 'OfferShippingDetails',
      shippingRate: { '@type': 'MonetaryAmount', value: 35, currency: 'EUR' },
      shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'ES' },
      deliveryTime: {
        '@type': 'ShippingDeliveryTime',
        handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 0, unitCode: 'DAY' },
        transitTime: { '@type': 'QuantitativeValue', minValue: 3, maxValue: 5, unitCode: 'DAY' },
      },
    });
  });

  it('takes returns for 14 days, the return shipping on us', () => {
    expect(productSchema(product, category).offers.hasMerchantReturnPolicy).toEqual({
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'ES',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: 14,
      returnMethod: 'https://schema.org/ReturnByMail',
      returnFees: 'https://schema.org/FreeReturn',
      merchantReturnLink: 'https://hsmuebles.es/devoluciones',
    });
  });

  it('links the returns page in the language of the product page', () => {
    expect(
      productSchema(product, category, 'en').offers.hasMerchantReturnPolicy.merchantReturnLink,
    ).toBe('https://hsmuebles.es/en/devoluciones');
  });

  it('keeps them on an offer that is out of stock', () => {
    const { offers } = productSchema({ ...product, inStock: false }, category);
    expect(offers.shippingDetails.shippingRate.value).toBe(35);
    expect(offers.hasMerchantReturnPolicy.merchantReturnDays).toBe(14);
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

describe('guide structured data', () => {
  const base = {
    url: 'https://hsmuebles.es/guias/medidas-tocador',
    title: 'Medidas de un tocador',
    description: 'Ancho, fondo y altura.',
    image: '/uploads/a_1600.webp',
    lang: 'es',
  };

  it('describes the article, written and published by the shop', () => {
    const node = articleSchema({
      ...base,
      publishedAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-20T10:00:00.000Z',
    });
    expect(node).toMatchObject({
      '@type': 'Article',
      headline: 'Medidas de un tocador',
      image: ['https://hsmuebles.es/uploads/a_1600.webp'],
      datePublished: '2026-10-01T10:00:00.000Z',
      dateModified: '2026-10-20T10:00:00.000Z',
      inLanguage: 'es',
      mainEntityOfPage: base.url,
      author: { '@type': 'Organization', name: 'Mirage Muebles' },
      publisher: { '@type': 'Organization', name: 'Mirage Muebles' },
    });
  });

  // An article pulled from the seed file has no dates yet; none is invented.
  it('leaves the dates out while there are none', () => {
    const node = articleSchema({ ...base, publishedAt: null, updatedAt: null });
    expect(node).not.toHaveProperty('datePublished');
    expect(node).not.toHaveProperty('dateModified');
  });

  it('turns the questions of the page into a FAQPage', () => {
    expect(faqSchema([{ q: '¿Altura?', a: '72–80 cm.' }])).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: '¿Altura?',
          acceptedAnswer: { '@type': 'Answer', text: '72–80 cm.' },
        },
      ],
    });
  });

  it('has no FAQPage without questions', () => {
    expect(faqSchema([])).toBeNull();
    expect(faqSchema(undefined)).toBeNull();
  });

  it('lists the guides of the section in the page language', () => {
    const list = guideListSchema(
      [{ slug: 'medidas-tocador', es: { title: 'Medidas' }, en: { title: 'Dimensions' } }],
      'en',
    );
    expect(list.itemListElement).toEqual([
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Dimensions',
        url: 'https://hsmuebles.es/en/guias/medidas-tocador',
      },
    ]);
  });
});
