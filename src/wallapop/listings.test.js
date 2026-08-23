import { describe, expect, it } from 'vitest';
import defaultCatalog from '../data/catalog.default.json';
import { INCLUDED_CATEGORY_SLUGS, WALLAPOP_CATEGORY_MAP } from './categories.js';
import {
  buildPanelState,
  buildWallapopDescription,
  buildWallapopTitle,
  collectProductPhotos,
  listingPriceBlock,
  mirrorWallapopSize,
  panelRecords,
  shelfWallapopSize,
  strikethroughText,
  vanityMirrorWallapopSize,
  vanityShelvesWallapopSize,
  vanityWallapopSize,
} from './listings.js';

const EXPECTED_PROMOTION_FOOTER = [
  'Ideal para:',
  '✨ Salones de belleza',
  '✨ Maquillistas',
  '✨ Estudios de estética',
  '✨ Espacios beauty modernos',
  '',
  '🪞 Dale a tu espacio un look más profesional y elegante.',
  '',
  '📩 Escríbenos ahora y reserva el tuyo antes de que termine la promoción',
].join('\n');

const EXPECTED_COMPACT_PROMOTION_FOOTER = [
  'Ideal para:',
  '✨ Salones de belleza',
  '✨ Maquillistas',
  '✨ Estudios de estética',
  '✨ Espacios beauty modernos',
  '',
  '🪞 Dale a tu espacio un look más profesional y elegante.',
  '📩 Entrega disponible. Escríbenos ahora y reserva el tuyo antes de que termine la promoción',
].join('\n');

describe('the slugs this module is pinned to', () => {
  // Categories carry no id, so their slug is their identity — and the admin can
  // rename one at any time. When that happened to `espejos-de-cuerpo-entero`
  // the category simply stopped matching and every mirror vanished from the
  // panel without a word. These two assertions turn the next rename into a
  // failing test instead of fifteen quietly missing listings.
  const catalogSlugs = new Set(defaultCatalog.map((category) => category.slug));

  it.each(INCLUDED_CATEGORY_SLUGS)('still finds the "%s" category in the catalog', (slug) => {
    expect(catalogSlugs).toContain(slug);
  });

  it('maps every included category to a Wallapop category', () => {
    expect(Object.keys(WALLAPOP_CATEGORY_MAP).sort()).toEqual([...INCLUDED_CATEGORY_SLUGS].sort());
  });
});

describe('Wallapop listing preparation', () => {
  it('imports only the four approved site categories', () => {
    const state = buildPanelState(defaultCatalog, null, '2026-08-06T12:00:00.000Z');
    const records = panelRecords(state);

    expect(records).toHaveLength(56);
    expect(new Set(records.map((record) => record.siteCategorySlug))).toEqual(
      new Set(Object.keys(WALLAPOP_CATEGORY_MAP)),
    );
    expect(records.some((record) => record.siteCategorySlug === 'otros-modelos')).toBe(false);
  });

  it('leaves out products that are out of stock', () => {
    const soldOutFirst = defaultCatalog.map((category) => ({
      ...category,
      products: category.products.map((product, i) =>
        i === 0 ? { ...product, inStock: false } : product,
      ),
    }));
    const records = panelRecords(buildPanelState(soldOutFirst, null, '2026-08-06T12:00:00.000Z'));
    const dropped = defaultCatalog
      .filter((c) => Object.keys(WALLAPOP_CATEGORY_MAP).includes(c.slug))
      .map((c) => c.products[0].id);

    expect(dropped.length).toBeGreaterThan(0);
    expect(records).toHaveLength(56 - dropped.length);
    for (const id of dropped) {
      expect(records.some((record) => record.productId === id)).toBe(false);
    }
  });

  it('creates Spanish titles without references and keeps the product link fields', () => {
    const state = buildPanelState(defaultCatalog, null, '2026-08-06T12:00:00.000Z');
    const records = panelRecords(state);

    for (const record of records) {
      expect(record.titleEs).not.toContain(record.reference);
      expect(record.titleEs).toContain(record.size);
      expect(record.productId).toBeTruthy();
      expect(record.reference).toBeTruthy();
      if (record.siteCategorySlug === 'espejos') {
        expect(record.descriptionEs).toContain('• Tipo: espejo de pie / de cuerpo entero');
        expect(record.descriptionEs).not.toContain('• Estado: nuevo');
      } else if (record.siteCategorySlug === 'estanterias') {
        expect(record.descriptionEs).toContain('• Tipo: estantería de pie');
        expect(record.descriptionEs).not.toContain('• Estado: nuevo');
      } else if (
        record.siteCategorySlug === 'tocadores' ||
        record.siteCategorySlug === 'tocadores-loft'
      ) {
        expect(record.descriptionEs).toContain('• Tipo: tocador de maquillaje con espejo');
        expect(record.descriptionEs).not.toContain('• Estado: nuevo');
      } else {
        expect(record.descriptionEs).toContain(`Referencia: ${record.reference}.`);
      }
      expect(record.wallapopCategory).toBe('Hogar y jardín');
      expect(record.photos.length).toBeGreaterThan(0);
    }
  });

  it('creates the approved mirror description with width before height', () => {
    const category = defaultCatalog.find((item) => item.slug === 'espejos');
    const product = category.products.find((item) => item.reference === 'F-05');
    const description = buildWallapopDescription(product, category);

    expect(mirrorWallapopSize(product)).toBe('80 × 180 cm');
    expect(description).toBe(
      [
        'Este espejo de diseño elegante aporta luminosidad y una mayor sensación de amplitud a cualquier estancia. Su estilo versátil combina perfectamente con muebles modernos, minimalistas o clásicos.',
        `Precio👇\n☑️ antes: ${strikethroughText('340€')}\n✅ ahora: 239€ 🔥🔥🔥`,
        '• Tipo: espejo de pie / de cuerpo entero\n• Medidas: 80 × 180 cm',
        '🎁 Bombillas LED de regalo',
        EXPECTED_COMPACT_PROMOTION_FOOTER,
      ].join('\n\n'),
    );
  });

  it('uses the matching site perk in every mirror description', () => {
    const category = defaultCatalog.find((item) => item.slug === 'espejos');
    const expectedPerks = {
      bulbs: '🎁 Bombillas LED de regalo',
      led: '💡 Iluminación LED profesional',
      quality: '⭐ Calidad premium',
    };

    for (const product of category.products) {
      const description = buildWallapopDescription(product, category);
      expect(description).toContain(expectedPerks[product.perks]);
      expect(description).toContain(`• Medidas: ${mirrorWallapopSize(product)}`);
    }
  });

  it('removes the luminosity claim only from premium mirror descriptions', () => {
    const category = defaultCatalog.find((item) => item.slug === 'espejos');
    const premiumProducts = category.products.filter((item) => item.perks === 'quality');
    const regularProduct = category.products.find((item) => item.perks !== 'quality');
    const premiumIntro =
      'Este espejo de diseño elegante aporta una mayor sensación de amplitud a cualquier estancia. Su estilo versátil combina perfectamente con muebles modernos, minimalistas o clásicos.';

    expect(premiumProducts.map((item) => item.reference)).toEqual(['D-11', 'D-05']);
    for (const product of premiumProducts) {
      expect(buildWallapopDescription(product, category).startsWith(premiumIntro)).toBe(true);
    }
    expect(buildWallapopDescription(regularProduct, category)).toContain(
      'aporta luminosidad y una mayor sensación de amplitud',
    );
  });

  it('uses the detailed site measurements when the product title differs', () => {
    const category = defaultCatalog.find((item) => item.slug === 'espejos');
    const product = category.products.find((item) => item.reference === 'D-05');

    expect(product.size).toBe('50 × 40 × 180 cm');
    expect(mirrorWallapopSize(product)).toBe('55 × 180 cm');
  });

  it('creates the approved shelf description with width, depth and height', () => {
    const category = defaultCatalog.find((item) => item.slug === 'estanterias');
    const product = category.products.find((item) => item.reference === 'E-04');
    const description = buildWallapopDescription(product, category);

    expect(shelfWallapopSize(product)).toBe('50 × 40 × 190 cm');
    expect(description).toBe(
      [
        'Estantería práctica y decorativa, perfecta para organizar libros, plantas, fotografías, accesorios y objetos de decoración.',
        `Precio👇\n☑️ antes: ${strikethroughText('500€')}\n✅ ahora: 389€ 🔥🔥🔥`,
        '• Tipo: estantería de pie\n• Medidas: 50 × 40 × 190 cm',
        '⭐ Calidad premium',
        EXPECTED_COMPACT_PROMOTION_FOOTER,
      ].join('\n\n'),
    );
  });

  it('adds the complete three-part size to every shelf description', () => {
    const category = defaultCatalog.find((item) => item.slug === 'estanterias');

    for (const product of category.products) {
      const description = buildWallapopDescription(product, category);
      expect(description).toContain(`• Medidas: ${shelfWallapopSize(product)}`);
      expect(description).toContain('⭐ Calidad premium');
    }
  });

  it('creates the approved vanity description with separate product and mirror sizes', () => {
    const category = defaultCatalog.find((item) => item.slug === 'tocadores');
    const product = category.products.find((item) => item.reference === 'L-01');
    const description = buildWallapopDescription(product, category);

    expect(vanityWallapopSize(product)).toBe('100 × 40 × 160 cm');
    expect(vanityMirrorWallapopSize(product)).toBe('100 × 80 cm');
    expect(description).toBe(
      [
        'Este elegante tocador con espejo aporta luminosidad y una mayor sensación de amplitud a cualquier estancia. Su diseño versátil combina perfectamente con interiores modernos, minimalistas o clásicos.',
        `Precio👇\n☑️ antes: ${strikethroughText('590€')}\n✅ ahora: 439€ 🔥🔥🔥`,
        '• Tipo: tocador de maquillaje con espejo\n• Medidas: 100 × 40 × 160 cm\n• Espejo: 100 × 80 cm',
        '🎁 Bombillas LED de regalo',
        EXPECTED_COMPACT_PROMOTION_FOOTER,
      ].join('\n\n'),
    );
  });

  it('imports the mirror size and matching perk for every vanity model', () => {
    const categories = defaultCatalog.filter((item) =>
      ['tocadores', 'tocadores-loft'].includes(item.slug),
    );
    const expectedPerks = {
      bulbs: '🎁 Bombillas LED de regalo',
      led: '💡 Iluminación LED profesional',
      quality: '⭐ Calidad premium',
    };
    const products = categories.flatMap((category) => category.products);

    expect(products).toHaveLength(31);
    for (const category of categories) {
      for (const product of category.products) {
        const description = buildWallapopDescription(product, category);
        expect(vanityMirrorWallapopSize(product)).toMatch(/^\d+(?:[.,]\d+)? × \d+(?:[.,]\d+)? cm$/);
        expect(description).toContain(`• Medidas: ${vanityWallapopSize(product)}`);
        expect(description).toContain(`• Espejo: ${vanityMirrorWallapopSize(product)}`);
        expect(description).toContain(expectedPerks[product.perks]);
      }
    }
  });

  it('supports every requested vanity perk label', () => {
    const category = defaultCatalog.find((item) => item.slug === 'tocadores');
    const product = category.products.find((item) => item.reference === 'L-01');
    const expectedPerks = {
      bulbs: '🎁 Bombillas LED de regalo',
      led: '💡 Iluminación LED profesional',
      quality: '⭐ Calidad premium',
    };

    for (const [perks, label] of Object.entries(expectedPerks)) {
      expect(buildWallapopDescription({ ...product, perks }, category)).toContain(label);
    }
  });

  it('uses the premium vanity intro without the luminosity claim', () => {
    const categories = defaultCatalog.filter((item) =>
      ['tocadores', 'tocadores-loft'].includes(item.slug),
    );
    const premiumIntro =
      'Este elegante tocador con espejo aporta una mayor sensación de amplitud a cualquier estancia. Su diseño versátil combina perfectamente con interiores modernos, minimalistas o clásicos.';

    for (const category of categories) {
      const product = category.products[0];
      expect(
        buildWallapopDescription({ ...product, perks: 'quality' }, category).startsWith(
          premiumIntro,
        ),
      ).toBe(true);
      expect(buildWallapopDescription(product, category)).toContain(
        'aporta luminosidad y una mayor sensación de amplitud',
      );
    }
  });

  it('adds shelf measurements only when they exist in the vanity description', () => {
    const categories = defaultCatalog.filter((item) =>
      ['tocadores', 'tocadores-loft'].includes(item.slug),
    );
    const productsWithShelves = categories.flatMap((category) =>
      category.products
        .filter((product) => vanityShelvesWallapopSize(product))
        .map((product) => ({ category, product })),
    );

    expect(productsWithShelves).toHaveLength(1);
    expect(productsWithShelves[0].product.reference).toBe('L-11');
    expect(vanityShelvesWallapopSize(productsWithShelves[0].product)).toBe('20 × 80 cm');
    expect(buildWallapopDescription(productsWithShelves[0].product, productsWithShelves[0].category))
      .toContain('• Espejo: 100 × 80 cm\n• Estanterías: 20 × 80 cm');

    for (const category of categories) {
      for (const product of category.products.filter(
        (item) => !vanityShelvesWallapopSize(item),
      )) {
        expect(buildWallapopDescription(product, category)).not.toContain('• Estanterías:');
      }
    }
  });

  it('adds current site prices before details and the promotion footer to every listing', () => {
    const categories = defaultCatalog.filter((item) =>
      Object.keys(WALLAPOP_CATEGORY_MAP).includes(item.slug),
    );

    for (const category of categories) {
      for (const product of category.products) {
        const description = buildWallapopDescription(product, category);
        const detailsMarker = '• Tipo:';
        const expectedFooter =
          category.slug === 'espejos' ||
          category.slug === 'estanterias' ||
          category.slug.startsWith('tocadores')
            ? EXPECTED_COMPACT_PROMOTION_FOOTER
            : EXPECTED_PROMOTION_FOOTER;

        expect(Number(product.oldPrice)).toBeGreaterThan(Number(product.price));
        expect(description).toContain(listingPriceBlock(product));
        expect(description.indexOf(listingPriceBlock(product))).toBeLessThan(
          description.indexOf(detailsMarker),
        );
        expect(description.endsWith(expectedFooter)).toBe(true);
      }
    }
  });

  it('preserves local workflow fields while refreshing catalog fields', () => {
    const initial = buildPanelState(defaultCatalog, null, '2026-08-06T12:00:00.000Z');
    const id = Object.keys(initial.products)[0];
    initial.products[id].status = 'sold';
    initial.products[id].notes = 'Entregado en mano';
    initial.products[id].price = -1;

    const refreshed = buildPanelState(defaultCatalog, initial, '2026-08-07T12:00:00.000Z');

    expect(refreshed.products[id].status).toBe('sold');
    expect(refreshed.products[id].notes).toBe('Entregado en mano');
    expect(refreshed.products[id].price).toBeGreaterThan(0);
  });

  it('deduplicates gallery and cover images', () => {
    const category = defaultCatalog.find((item) => item.slug === 'tocadores');
    const product = category.products[0];
    const photos = collectProductPhotos(product);

    expect(new Set(photos).size).toBe(photos.length);
    expect(buildWallapopTitle(product, category)).not.toContain(product.reference);
    expect(buildWallapopTitle(product, category)).toContain(product.size);
    expect(buildWallapopDescription(product, category)).toContain(
      '• Tipo: tocador de maquillaje con espejo',
    );
  });
});
