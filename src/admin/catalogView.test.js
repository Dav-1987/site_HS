import { describe, expect, it } from 'vitest';
import { catalogRows, filterCounts, matchesSearch, normalizeSearch } from './catalogView.js';

const product = (id, extra = {}) => ({
  id,
  name: id,
  price: 500,
  oldPrice: 700,
  media: [
    { type: 'image', src: `/uploads/${id}-1.jpg` },
    { type: 'image', src: `/uploads/${id}-2.jpg` },
  ],
  ...extra,
});

const CATALOG = [
  {
    slug: 'tocadores',
    products: [
      product('Tocador-L-06', {
        name: 'Tocador | Hollywood Blanco con Doble Cajonera',
        reference: 'L-06',
      }),
      product('Tocador-T-09', { visibility: 'unlisted', reference: 'T-09' }),
      product('Tocador-L-99', { media: [{ type: 'image', src: '/a.jpg' }], oldPrice: 0 }),
    ],
  },
  {
    slug: 'estanterias',
    products: [product('Estanteria-E-01', { name: 'Estantería Roble', inStock: false })],
  },
];

const listed = (opts) => catalogRows(CATALOG, opts).map(({ product: p }) => p.id);

describe('search', () => {
  it('ignores case, accents and extra spaces', () => {
    expect(normalizeSearch('  Estantería   ROBLE ')).toBe('estanteria roble');
  });

  it('finds by any word of the name, the reference or the id', () => {
    const p = CATALOG[0].products[0];
    expect(matchesSearch(p, 'l-06')).toBe(true);
    expect(matchesSearch(p, 'doble cajonera')).toBe(true);
    expect(matchesSearch(p, 'tocador-l-06')).toBe(true);
    expect(matchesSearch(p, 'doble nogal')).toBe(false);
  });

  it('looks through the whole catalog, whatever category is open', () => {
    expect(listed({ slug: 'tocadores', query: 'estanteria' })).toEqual(['Estanteria-E-01']);
  });
});

describe('catalogRows', () => {
  it('lists one category, or every one in catalog order', () => {
    expect(listed({ slug: 'estanterias' })).toEqual(['Estanteria-E-01']);
    expect(listed({})).toHaveLength(4);
  });

  it('keeps only what passes every filter that is on', () => {
    expect(listed({ filters: ['hidden'] })).toEqual(['Tocador-T-09']);
    expect(listed({ filters: ['out'] })).toEqual(['Estanteria-E-01']);
    expect(listed({ filters: ['onephoto', 'nosale'] })).toEqual(['Tocador-L-99']);
    expect(listed({ filters: ['hidden', 'out'] })).toEqual([]);
  });

  it('keeps «На сайте» to products shown in a section that is shown too', () => {
    const catalog = [
      ...CATALOG,
      { slug: 'otros', visibility: 'off', products: [product('Comoda-B01')] },
      { slug: 'loft', visibility: 'unlisted', products: [product('Tocador-M-05')] },
    ];
    const live = catalogRows(catalog, { filters: ['live'] }).map(({ product: p }) => p.id);
    expect(live).toEqual(['Tocador-L-06', 'Tocador-L-99', 'Estanteria-E-01']);
    expect(filterCounts(catalog, {}).live).toBe(3);
  });

  it('hands back each product with its category', () => {
    const [row] = catalogRows(CATALOG, { query: 'roble' });
    expect(row.category.slug).toBe('estanterias');
  });
});

describe('filterCounts', () => {
  it('counts within the category and the search, before filtering', () => {
    expect(filterCounts(CATALOG, { slug: 'tocadores' })).toEqual({
      live: 2,
      hidden: 1,
      out: 0,
      onephoto: 1,
      nosale: 1,
    });
    expect(filterCounts(CATALOG, {}).out).toBe(1);
  });
});
