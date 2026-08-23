import { describe, it, expect } from 'vitest';
import { buildGoogleFeed, feedProducts } from './feed.js';

function product(over = {}) {
  return {
    id: 'Tocador-M-01',
    name: 'Tocador',
    subtitle: '90 × 40 × 170 cm',
    price: 499,
    oldPrice: 0,
    reference: 'M-01',
    material: { es: 'Melamina', en: 'Melamine' },
    size: '90 × 40 × 170 cm',
    description: { es: 'Un tocador.', en: 'A dressing table.' },
    media: [{ type: 'image', src: '/uploads/a.jpg' }],
    ...over,
  };
}

function catalog(products, over = {}) {
  return [
    {
      slug: 'tocadores',
      name: { es: 'Tocadores', en: 'Dressing tables' },
      products,
      ...over,
    },
  ];
}

/** Every <g:*> value of the first item, as a plain object. */
function fields(xml, name) {
  return [...xml.matchAll(new RegExp(`<g:${name}>([\\s\\S]*?)</g:${name}>`, 'g'))].map((m) => m[1]);
}

describe('feedProducts — what goes in', () => {
  it('takes a public product in a public category', () => {
    expect(feedProducts(catalog([product()]))).toHaveLength(1);
  });

  // The whole point of deriving the feed from site state: nothing can be
  // advertised that the site does not show.
  it('skips products that are off or unlisted', () => {
    expect(feedProducts(catalog([product({ visibility: 'off' })]))).toHaveLength(0);
    expect(feedProducts(catalog([product({ visibility: 'unlisted' })]))).toHaveLength(0);
  });

  it('skips every product of a category that is off or unlisted', () => {
    expect(feedProducts(catalog([product()], { visibility: 'off' }))).toHaveLength(0);
    expect(feedProducts(catalog([product()], { visibility: 'unlisted' }))).toHaveLength(0);
  });

  it('skips products Google would reject anyway — no price, no photo', () => {
    expect(feedProducts(catalog([product({ price: 0 })]))).toHaveLength(0);
    expect(feedProducts(catalog([product({ media: [] })]))).toHaveLength(0);
    // A video is not a photo.
    expect(
      feedProducts(catalog([product({ media: [{ type: 'video', src: '/uploads/v.mp4' }] })])),
    ).toHaveLength(0);
  });

  // Out of stock keeps the item in Merchant Center with its identity and its
  // history; dropping it would make it re-enter as a new product later.
  it('keeps a product that is out of stock', () => {
    expect(feedProducts(catalog([product({ inStock: false })]))).toHaveLength(1);
  });

  it('reads the whole catalog, not just the first category', () => {
    const two = [...catalog([product()]), ...catalog([product({ id: 'Espejo-F-01' })])];
    expect(feedProducts(two)).toHaveLength(2);
  });
});

describe('buildGoogleFeed — the XML', () => {
  it('is well-formed XML', () => {
    const xml = buildGoogleFeed(catalog([product(), product({ id: 'Tocador-M-02' })]));
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(doc.querySelectorAll('item')).toHaveLength(2);
  });

  it('escapes text that would otherwise break the document', () => {
    const xml = buildGoogleFeed(
      catalog([product({ name: 'Tocador "Loft" & <Espejo>', description: { es: 'a < b & c' } })]),
    );
    expect(xml).not.toContain('<Espejo>');
    expect(fields(xml, 'title')[0]).toBe('Tocador &quot;Loft&quot; &amp; &lt;Espejo&gt; 90 × 40 × 170 cm');
    expect(new DOMParser().parseFromString(xml, 'application/xml').querySelector('parsererror'))
      .toBeNull();
  });

  // Five references are duplicated across the catalog (M-01…M-05 appear twice),
  // so the reference cannot be the feed id — Google requires it unique.
  it('identifies items by product id, not by reference', () => {
    const xml = buildGoogleFeed(catalog([product()]));
    expect(fields(xml, 'id')[0]).toBe('Tocador-M-01');
    expect(xml).not.toContain('<g:mpn>');
    expect(fields(xml, 'identifier_exists')[0]).toBe('no');
  });

  // The name alone is the same bare word for a whole category ("Tocador" ×50),
  // so the title has to carry the dimensions that tell two items apart.
  it('titles items the way the product page does', () => {
    expect(fields(buildGoogleFeed(catalog([product()])), 'title')[0]).toBe(
      'Tocador 90 × 40 × 170 cm',
    );
  });

  it('links to the canonical Spanish product URL', () => {
    expect(fields(buildGoogleFeed(catalog([product()])), 'link')[0]).toBe(
      'https://hsmuebles.es/tocadores/Tocador-M-01',
    );
  });

  it('makes every image an absolute URL of the largest variant', () => {
    const xml = buildGoogleFeed(
      catalog([
        product({
          media: [
            { type: 'image', src: '/uploads/a.jpg' },
            { type: 'video', src: '/uploads/v.mp4' },
            { type: 'image', src: '/uploads/b.jpg' },
          ],
        }),
      ]),
    );
    expect(fields(xml, 'image_link')[0]).toBe('https://hsmuebles.es/uploads/a_1600.webp');
    expect(fields(xml, 'additional_image_link')).toEqual([
      'https://hsmuebles.es/uploads/b_1600.webp',
    ]);
  });

  it('caps the extra images at the ten Google accepts', () => {
    const media = Array.from({ length: 15 }, (_, i) => ({
      type: 'image',
      src: `/uploads/p${i}.jpg`,
    }));
    const xml = buildGoogleFeed(catalog([product({ media })]));
    expect(fields(xml, 'image_link')).toHaveLength(1);
    expect(fields(xml, 'additional_image_link')).toHaveLength(10);
  });

  describe('price', () => {
    it('sends a single price when the product is not discounted', () => {
      const xml = buildGoogleFeed(catalog([product({ price: 499, oldPrice: 0 })]));
      expect(fields(xml, 'price')[0]).toBe('499.00 EUR');
      expect(xml).not.toContain('<g:sale_price>');
    });

    // Shopping then draws the same struck-through pair as the product page.
    it('sends the old price as price and the current one as sale_price', () => {
      const xml = buildGoogleFeed(catalog([product({ price: 639, oldPrice: 800 })]));
      expect(fields(xml, 'price')[0]).toBe('800.00 EUR');
      expect(fields(xml, 'sale_price')[0]).toBe('639.00 EUR');
    });

    // An "old price" below the current one is not a discount — the page ignores
    // it too, and sending it would advertise a higher price than we charge.
    it('ignores an old price that is not higher', () => {
      const xml = buildGoogleFeed(catalog([product({ price: 499, oldPrice: 400 })]));
      expect(fields(xml, 'price')[0]).toBe('499.00 EUR');
      expect(xml).not.toContain('<g:sale_price>');
    });
  });

  describe('availability', () => {
    it('is in_stock by default', () => {
      expect(fields(buildGoogleFeed(catalog([product()])), 'availability')[0]).toBe('in_stock');
    });

    // Must agree with the Offer on the landing page (see src/seo/schema.js):
    // Merchant Center compares the two.
    it('follows the admin switch', () => {
      const xml = buildGoogleFeed(catalog([product({ inStock: false })]));
      expect(fields(xml, 'availability')[0]).toBe('out_of_stock');
      // Still a priced, complete item — it just cannot be bought right now.
      expect(fields(xml, 'price')[0]).toBe('499.00 EUR');
    });

    // Meta's Shop hides any item whose quantity is 0 or missing, so the same
    // switch has to drive the count as well as the availability string.
    it('carries a sellable quantity that follows the same switch', () => {
      expect(fields(buildGoogleFeed(catalog([product()])), 'quantity_to_sell_on_facebook')[0]).toBe(
        '100',
      );
      expect(
        fields(
          buildGoogleFeed(catalog([product({ inStock: false })])),
          'quantity_to_sell_on_facebook',
        )[0],
      ).toBe('0');
    });
  });

  it('carries the fixed fields Google needs for own-brand goods', () => {
    const xml = buildGoogleFeed(catalog([product()]));
    expect(fields(xml, 'brand')[0]).toBe('Mirage Muebles');
    expect(fields(xml, 'condition')[0]).toBe('new');
    expect(fields(xml, 'product_type')[0]).toBe('Tocadores');
    // Left to Google: a wrong override is worse than no override.
    expect(xml).not.toContain('<g:google_product_category>');
  });

  it('falls back to the generated description when none was written', () => {
    const xml = buildGoogleFeed(catalog([product({ description: { es: '', en: '' } })]));
    const desc = fields(xml, 'description')[0];
    expect(desc).toContain('melamina');
    expect(desc).toContain('90 × 40 × 170 cm');
  });

  it('produces a channel and no items for an empty catalog', () => {
    const xml = buildGoogleFeed([]);
    expect(xml).toContain('<channel>');
    expect(xml).not.toContain('<item>');
    expect(new DOMParser().parseFromString(xml, 'application/xml').querySelector('parsererror'))
      .toBeNull();
  });
});
