import { describe, it, expect } from 'vitest';
import { buildGoogleFeed, buildMetaFeed, buildPinterestFeed, feedProducts } from './feed.js';

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

/** Small independent CSV parser used to verify quoting, commas and newlines. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field === '') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field || row.length) rows.push([...row, field]);
  return rows;
}

function csvRecords(text) {
  const [headers, ...rows] = parseCsv(text);
  return rows
    .filter((row) => row.some(Boolean))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
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
    expect(fields(xml, 'title')[0]).toBe(
      'Tocador &quot;Loft&quot; &amp; &lt;Espejo&gt; 90 × 40 × 170 cm',
    );
    expect(
      new DOMParser().parseFromString(xml, 'application/xml').querySelector('parsererror'),
    ).toBeNull();
  });

  // Five references are duplicated across the catalog (M-01…M-05 appear twice,
  // once on a dressing table and once on a manicure table), so the reference
  // can be neither the feed id nor the mpn — both have to be unique.
  it('identifies items by product id, not by reference', () => {
    const xml = buildGoogleFeed(catalog([product({ reference: 'M-01' })]));
    expect(fields(xml, 'id')[0]).toBe('Tocador-M-01');
    expect(fields(xml, 'mpn')[0]).toBe('Tocador-M-01');
    expect(fields(xml, 'mpn')[0]).not.toBe('M-01');
  });

  // Claiming no identifier exists while the landing page publishes an mpn is
  // the contradiction this replaced: Google reads both and compares them.
  it('no longer claims the product has no identifier', () => {
    expect(buildGoogleFeed(catalog([product()]))).not.toContain('identifier_exists');
    expect(buildMetaFeed(catalog([product()]))).not.toContain('identifier_exists');
    expect(buildPinterestFeed(catalog([product()]))).not.toContain('identifier_exists');
  });

  it('gives Pinterest the same mpn', () => {
    expect(fields(buildPinterestFeed(catalog([product()])), 'mpn')[0]).toBe('Tocador-M-01');
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
  });

  it('carries the fixed fields Google needs for own-brand goods', () => {
    const xml = buildGoogleFeed(catalog([product()]));
    expect(fields(xml, 'brand')[0]).toBe('Mirage Muebles');
    expect(fields(xml, 'condition')[0]).toBe('new');
    expect(fields(xml, 'product_type')[0]).toBe('Tocadores');
    // Left to Google: a wrong override is worse than no override.
    expect(xml).not.toContain('<g:google_product_category>');
  });

  // Merchant Center forbids promotional text in the description. The gift line
  // is a real argument on the product page, so it is dropped here rather than
  // there — the shop keeps its offer, Google gets the furniture described.
  describe('promotional text', () => {
    const gift = { es: 'Medidas:\n• ancho 80cm\n\n🎁 Bombillas LED de regalo' };

    it('drops the gift line and keeps the measurements', () => {
      const xml = buildGoogleFeed(catalog([product({ description: gift })]));
      const desc = fields(xml, 'description')[0];
      expect(desc).not.toContain('regalo');
      expect(desc).toContain('ancho 80cm');
    });

    it('leaves no blank gap where the line used to be', () => {
      const xml = buildGoogleFeed(catalog([product({ description: gift })]));
      expect(fields(xml, 'description')[0]).toBe('Medidas:\n• ancho 80cm');
    });

    it('catches the other wordings a promotion arrives in', () => {
      for (const line of [
        'Estanterías de regalo',
        'Envío gratis',
        'Montaje gratuito',
        '20% de descuento',
        'Oferta especial',
        'Aprovecha la promoción',
        'Sin coste adicional',
      ]) {
        const xml = buildGoogleFeed(
          catalog([product({ description: { es: `Medidas: 80cm\n${line}` } })]),
        );
        expect(fields(xml, 'description')[0]).toBe('Medidas: 80cm');
      }
    });

    // Whole lines only — a promotion always sits on its own, and cutting a
    // clause out of a sentence would read worse than leaving it.
    it('keeps a line that merely resembles one of the words', () => {
      const xml = buildGoogleFeed(
        catalog([product({ description: { es: 'La empresa ofrece envío a toda España.' } })]),
      );
      expect(fields(xml, 'description')[0]).toBe('La empresa ofrece envío a toda España.');
    });

    // Google rejects an item with no description at all.
    it('falls back to the title when nothing survives', () => {
      const xml = buildGoogleFeed(
        catalog([product({ description: { es: '🎁 Bombillas LED de regalo' } })]),
      );
      expect(fields(xml, 'description')[0]).toBe('Tocador 90 × 40 × 170 cm');
    });
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
    expect(
      new DOMParser().parseFromString(xml, 'application/xml').querySelector('parsererror'),
    ).toBeNull();
  });
});

// ── the Meta feed ───────────────────────────────────────────────────────────
//
// CSV gives Meta's nested video fields unambiguous column names while the
// common product record keeps identity, price and copy aligned with Google.

describe('buildMetaFeed', () => {
  it('produces one complete CSV row per product', () => {
    const rows = parseCsv(buildMetaFeed(catalog([product(), product({ id: 'Tocador-M-02' })])));
    const [headers, ...items] = rows;
    expect(items).toHaveLength(2);
    expect(items.every((row) => row.length === headers.length)).toBe(true);
    expect(headers).toContain('video[0].url');
    expect(headers).toContain('video[19].url');
  });

  it('keeps the event-matching id and every product fact aligned with Google', () => {
    const cat = catalog([product({ price: 399, oldPrice: 499 })]);
    const meta = csvRecords(buildMetaFeed(cat))[0];
    const google = buildGoogleFeed(cat);

    for (const name of [
      'id',
      'title',
      'description',
      'link',
      'price',
      'sale_price',
      'brand',
      'condition',
      'mpn',
      'product_type',
    ]) {
      expect(meta[name]).toBe(fields(google, name)[0]);
    }
    expect(meta.availability).toBe('in stock');
    expect(fields(google, 'availability')[0]).toBe('in_stock');
  });

  it('uses honest Meta availability without inventing a checkout quantity', () => {
    const meta = csvRecords(buildMetaFeed(catalog([product({ inStock: false })])))[0];
    expect(meta.availability).toBe('out of stock');
    expect(meta).not.toHaveProperty('quantity_to_sell_on_facebook');
  });

  it('uses original JPGs and accepts twenty additional images', () => {
    const media = Array.from({ length: 25 }, (_, index) => ({
      type: 'image',
      src: `/uploads/p${index}.jpg`,
    }));
    const meta = csvRecords(buildMetaFeed(catalog([product({ media })])))[0];
    const extra = meta.additional_image_link.split(',');
    expect(meta.image_link).toBe('https://hsmuebles.es/uploads/p0.jpg');
    expect(extra).toHaveLength(20);
    expect(extra.at(-1)).toBe('https://hsmuebles.es/uploads/p20.jpg');
  });

  it('adds up to twenty direct product videos in gallery order', () => {
    const media = [
      { type: 'image', src: '/uploads/cover.jpg' },
      ...Array.from({ length: 22 }, (_, index) => ({
        type: 'video',
        src: `/uploads/v${index}.mp4`,
      })),
    ];
    const meta = csvRecords(buildMetaFeed(catalog([product({ media })])))[0];
    expect(meta['video[0].url']).toBe('https://hsmuebles.es/uploads/v0.mp4');
    expect(meta['video[19].url']).toBe('https://hsmuebles.es/uploads/v19.mp4');
    expect(meta).not.toHaveProperty('video[20].url');
  });

  it('adds material, size, taxonomy and useful product-set labels', () => {
    const meta = csvRecords(
      buildMetaFeed(
        catalog([
          product({
            price: 399,
            oldPrice: 499,
            media: [
              { type: 'image', src: '/uploads/a.jpg' },
              { type: 'video', src: '/uploads/a.mp4' },
            ],
          }),
        ]),
      ),
    )[0];
    expect(meta.material).toBe('Melamina');
    expect(meta.size).toBe('90 × 40 × 170 cm');
    expect(meta.google_product_category).toBe('4148');
    expect(meta.internal_label).toBe("['category:tocadores','has_video','on_sale']");
  });

  it('quotes commas, double quotes and line breaks without changing the copy', () => {
    const meta = csvRecords(
      buildMetaFeed(
        catalog([
          product({
            name: 'Tocador "Loft", edición',
            description: { es: 'Línea uno,\n"Línea dos"' },
          }),
        ]),
      ),
    )[0];
    expect(meta.title).toBe('Tocador "Loft", edición 90 × 40 × 170 cm');
    expect(meta.description).toBe('Línea uno,\n"Línea dos"');
  });

  it('returns the stable header and no rows for an empty catalog', () => {
    const csv = buildMetaFeed([]);
    expect(csvRecords(csv)).toEqual([]);
    expect(parseCsv(csv)[0]).toContain('id');
    expect(parseCsv(csv)[0]).toContain('video[19].url');
  });
});

// ── the Pinterest feed ──────────────────────────────────────────────────────
//
// It exists for one tag. These guard the two things a second feed can get
// wrong: describing the product differently from the first, and categorising by
// guesswork.

describe('buildPinterestFeed', () => {
  const label = (over) => catalog([product(over)]);

  it('publishes the first hosted product video and keeps the image fallback', () => {
    const xml = buildPinterestFeed(
      label({
        media: [
          { type: 'image', src: '/uploads/a.jpg' },
          { type: 'video', src: '/uploads/primary.mp4' },
          { type: 'video', src: '/uploads/secondary.mp4' },
        ],
      }),
    );

    expect(fields(xml, 'video_link')).toEqual(['https://hsmuebles.es/uploads/primary.mp4']);
    expect(fields(xml, 'image_link')).toHaveLength(1);
    expect(xml).not.toContain('secondary.mp4');
  });

  it('omits video_link when the product has no video', () => {
    expect(fields(buildPinterestFeed(label({})), 'video_link')).toEqual([]);
  });

  it('categorises from the first word of the title, not from the site category', () => {
    // "Otros Modelos" is the bucket 68 real products sit in; the title decides.
    const xml = buildPinterestFeed(
      catalog([product({ name: 'Espejo', subtitle: '80 × 180 cm' })], {
        slug: 'otros-modelos',
        name: { es: 'Otros Modelos', en: 'Other models' },
      }),
    );
    expect(fields(xml, 'google_product_category')).toEqual(['595']);
    expect(fields(xml, 'product_type')).toEqual(['Otros Modelos']);
  });

  it('maps every noun the catalog actually uses', () => {
    const cases = [
      ['Tocador', '4148'],
      ['Espejo', '595'],
      // 465 is the free-standing unit, not 6372, the wall shelf — every
      // shelving piece in the catalog is 150–200 cm tall.
      ['Estantería', '465'],
      ['Consola', '1602'],
      ['Comoda', '4195'],
      ['Mesa', '6392'],
    ];
    for (const [name, id] of cases) {
      expect(fields(buildPinterestFeed(label({ name })), 'google_product_category')).toEqual([id]);
    }
  });

  it('ignores accents, so Estantería and Estanteria are one word', () => {
    expect(
      fields(buildPinterestFeed(label({ name: 'Estanteria' })), 'google_product_category'),
    ).toEqual(['465']);
  });

  // A wrong category costs more than no category: it puts a mirror in front of
  // people shopping for something else.
  it('omits the tag rather than guessing at an unknown noun', () => {
    expect(
      fields(buildPinterestFeed(label({ name: 'Alfombra' })), 'google_product_category'),
    ).toEqual([]);
  });

  it('never invents a Facebook checkout quantity in the XML feeds', () => {
    expect(fields(buildPinterestFeed(label({})), 'quantity_to_sell_on_facebook')).toEqual([]);
    expect(fields(buildGoogleFeed(label({})), 'quantity_to_sell_on_facebook')).toEqual([]);
  });

  it('never carries google_product_category into the Google feed', () => {
    expect(fields(buildGoogleFeed(label({})), 'google_product_category')).toEqual([]);
  });

  // The point of one commonItemData: the two feeds cannot drift about price,
  // availability, images or identity.
  it('describes the product identically to the Google feed', () => {
    const cat = label({ price: 399, oldPrice: 499 });
    for (const name of [
      'id',
      'title',
      'description',
      'link',
      'image_link',
      'price',
      'sale_price',
      'availability',
      'brand',
      'condition',
      'product_type',
    ]) {
      expect(fields(buildPinterestFeed(cat), name)).toEqual(fields(buildGoogleFeed(cat), name));
    }
  });
});

// ── the promotional-line filter ─────────────────────────────────────────────
//
// Merchant Center keeps `description` for the product. The filter guards that,
// and these guard the filter: a real Tocador-T-02 shipped its English gift line
// to Google because the pattern only knew Spanish.

describe('cleanDescription — what never reaches a feed', () => {
  const desc = (text) =>
    fields(buildGoogleFeed(catalog([product({ description: { es: text } })])), 'description')[0];

  it('drops the Spanish gift line 51 products carry', () => {
    expect(desc('Medidas: 80 cm\n\n🎁 Bombillas LED de regalo')).toBe('Medidas: 80 cm');
  });

  // The bug: English pasted into the Spanish field walked straight past.
  it('drops the same line written in English', () => {
    expect(desc('Medidas: 80 cm\n\n🎁 Free LED bulbs included')).toBe('Medidas: 80 cm');
  });

  it('drops a gift line on the emoji alone, whatever the wording', () => {
    expect(desc('Medidas: 80 cm\n\n🎁 Bombillas incluidas')).toBe('Medidas: 80 cm');
  });

  // 'sale' is salir far more often than it is a discount, and cutting a real
  // sentence costs more than letting one English word through.
  it('keeps a sentence where sale is the Spanish verb', () => {
    const text = 'El cajón sale suavemente.';
    expect(desc(text)).toBe(text);
  });

  it('keeps an ordinary description untouched', () => {
    const text = 'Tocador de melamina con espejo LED.';
    expect(desc(text)).toBe(text);
  });

  // Google rejects an empty description, so something must survive.
  it('falls back to the title when the description is nothing but promotion', () => {
    expect(desc('🎁 Todo gratis')).toBe('Tocador 90 × 40 × 170 cm');
  });
});
