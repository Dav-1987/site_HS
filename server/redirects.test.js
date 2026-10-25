import { describe, it, expect } from 'vitest';
import { buildRedirectIndex, resolveRedirect, withQuery } from './redirects.js';

const catalog = [
  { slug: 'tocadores', products: [{ id: 'Tocador-T-04' }] },
  { slug: 'otros-modelos', products: [{ id: 'Comoda-B01' }, { id: 'Tocador-T-01' }] },
];
const index = buildRedirectIndex(catalog);

// The catalog as it stands once the owner switched sections off: whole sections
// (one of a single kind, one mixed), single products in open sections, and an
// unlisted product that has to stay where it is.
const withOff = [
  {
    slug: 'espejos',
    products: [
      { id: 'Espejo-K01', name: 'Espejo | Redondo' },
      { id: 'Espejo-Alto-D05', name: 'Espejo | de pie dorado', visibility: 'off' },
      { id: 'Espejo-Alto-D06', name: 'Espejo | de pie blanco', visibility: 'unlisted' },
    ],
  },
  {
    slug: 'tocadores',
    products: [
      { id: 'Tocador-T-04', name: 'Tocador | Hollywood' },
      { id: 'Tocador-T-09', name: 'Tocador | Compacto', visibility: 'off' },
    ],
  },
  {
    slug: 'tocadores-loft',
    visibility: 'off',
    products: [
      { id: 'Tocador-M-05', name: 'Tocador | Loft blanco' },
      { id: 'Tocador-M-01', name: 'Tocador | Loft roble' },
    ],
  },
  {
    slug: 'otros-modelos',
    visibility: 'off',
    products: [
      { id: 'Espejo-Alto-D02', name: 'Espejo | Arqueado de cuerpo entero' },
      { id: 'Tocador-T-30', name: 'Tocador | Hollywood negro' },
      { id: 'Consola-S01', name: 'Consola con espejo | Blanca' },
      { id: 'Comoda-B01', name: 'Cómoda | Blanca' },
    ],
  },
  {
    slug: 'estanterias',
    visibility: 'off',
    products: [{ id: 'Estanteria-E-09', name: 'Estantería | Gris' }],
  },
];
const offIndex = buildRedirectIndex(withOff);

describe('buildRedirectIndex', () => {
  it('maps every product id to its category slug', () => {
    expect(index.products.get('Tocador-T-04')).toEqual({ slug: 'tocadores', off: null });
    expect(index.products.get('Comoda-B01')).toEqual({ slug: 'otros-modelos', off: null });
    expect(index.products.size).toBe(3);
    expect([...index.categories.keys()]).toEqual(['tocadores', 'otros-modelos']);
  });

  it('tolerates a missing or malformed catalog', () => {
    expect(buildRedirectIndex(null).products.size).toBe(0);
    const broken = buildRedirectIndex([{ slug: 'x' }, { slug: 'y', products: [null] }, null]);
    expect(broken.products.size).toBe(0);
    expect(broken.categories.size).toBe(2);
  });
});

describe('resolveRedirect', () => {
  it('sends a merged category to the section that absorbed it', () => {
    expect(resolveRedirect('/comodas', index)).toBe('/otros-modelos');
    expect(resolveRedirect('/mesas-de-manicura', index)).toBe('/otros-modelos');
  });

  it('sends a moved product to its current category', () => {
    expect(resolveRedirect('/comodas/Comoda-B01', index)).toBe('/otros-modelos/Comoda-B01');
    expect(resolveRedirect('/tocadores/Tocador-T-01', index)).toBe('/otros-modelos/Tocador-T-01');
  });

  it('preserves the /en prefix', () => {
    expect(resolveRedirect('/en/consolas', index)).toBe('/en/otros-modelos');
    expect(resolveRedirect('/en/comodas/Comoda-B01', index)).toBe('/en/otros-modelos/Comoda-B01');
    expect(resolveRedirect('/en/categoria/tocadores', index)).toBe('/en/tocadores');
    expect(resolveRedirect('/en/producto/Comoda-B01', index)).toBe('/en/otros-modelos/Comoda-B01');
  });

  it('leaves canonical URLs alone', () => {
    expect(resolveRedirect('/tocadores', index)).toBeNull();
    expect(resolveRedirect('/tocadores/', index)).toBeNull();
    expect(resolveRedirect('/tocadores/Tocador-T-04', index)).toBeNull();
    expect(resolveRedirect('/en/otros-modelos/Comoda-B01', index)).toBeNull();
  });

  it('ignores non-catalog and unknown paths', () => {
    expect(resolveRedirect('/', index)).toBeNull();
    expect(resolveRedirect('/en', index)).toBeNull();
    expect(resolveRedirect('/contacto', index)).toBeNull();
    expect(resolveRedirect('/tocadores/ghost-id', index)).toBeNull();
    expect(resolveRedirect('/producto/ghost-id', index)).toBeNull();
    expect(resolveRedirect('/categoria/ghost', index)).toBeNull();
    expect(resolveRedirect('/a/b/c', index)).toBeNull();
  });

  it('redirects the legacy /categoria/<slug> form in one hop', () => {
    expect(resolveRedirect('/categoria/tocadores', index)).toBe('/tocadores');
    expect(resolveRedirect('/categoria/comodas', index)).toBe('/otros-modelos');
  });

  it('redirects the legacy /producto/<id> form to the canonical URL', () => {
    expect(resolveRedirect('/producto/Comoda-B01', index)).toBe('/otros-modelos/Comoda-B01');
  });

  it('treats a merged slug that is a section again as that section', () => {
    // Espejos was folded into Otros Modelos once and came back since.
    expect(resolveRedirect('/categoria/espejos', offIndex)).toBe('/espejos');
    expect(resolveRedirect('/en/categoria/espejos', offIndex)).toBe('/en/espejos');
    expect(resolveRedirect('/espejos', offIndex)).toBeNull();
  });
});

describe('resolveRedirect — switched-off products and sections', () => {
  it('sends a product to the open section of its kind', () => {
    expect(resolveRedirect('/otros-modelos/Espejo-Alto-D02', offIndex)).toBe('/espejos');
    expect(resolveRedirect('/otros-modelos/Tocador-T-30', offIndex)).toBe('/tocadores');
    expect(resolveRedirect('/tocadores-loft/Tocador-M-05', offIndex)).toBe('/tocadores');
  });

  it('sends every other kind to the catalogue', () => {
    // "Consola con espejo" is a console: the first word decides, not any word.
    expect(resolveRedirect('/otros-modelos/Consola-S01', offIndex)).toBe('/catalogo');
    expect(resolveRedirect('/otros-modelos/Comoda-B01', offIndex)).toBe('/catalogo');
    expect(resolveRedirect('/estanterias/Estanteria-E-09', offIndex)).toBe('/catalogo');
  });

  it('applies to a product switched off on its own inside an open section', () => {
    expect(resolveRedirect('/espejos/Espejo-Alto-D05', offIndex)).toBe('/espejos');
    expect(resolveRedirect('/tocadores/Tocador-T-09', offIndex)).toBe('/tocadores');
  });

  it('leaves unlisted and public products where they are', () => {
    expect(resolveRedirect('/espejos/Espejo-Alto-D06', offIndex)).toBeNull();
    expect(resolveRedirect('/espejos/Espejo-K01', offIndex)).toBeNull();
  });

  it('sends a section of one kind where its products go, a mixed one to the catalogue', () => {
    expect(resolveRedirect('/tocadores-loft', offIndex)).toBe('/tocadores');
    expect(resolveRedirect('/otros-modelos', offIndex)).toBe('/catalogo');
    expect(resolveRedirect('/estanterias', offIndex)).toBe('/catalogo');
    expect(
      buildRedirectIndex([{ slug: 'empty', visibility: 'off', products: [] }]).categories.get(
        'empty',
      ),
    ).toEqual({ off: 'catalogo' });
  });

  it('keeps the /en prefix', () => {
    expect(resolveRedirect('/en/otros-modelos/Espejo-Alto-D02', offIndex)).toBe('/en/espejos');
    expect(resolveRedirect('/en/otros-modelos', offIndex)).toBe('/en/catalogo');
  });

  it('gets there in one hop from any old address', () => {
    // The product used to live under /espejos, before Otros Modelos absorbed it.
    expect(resolveRedirect('/espejos/Espejo-Alto-D02', offIndex)).toBe('/espejos');
    expect(resolveRedirect('/producto/Espejo-Alto-D02', offIndex)).toBe('/espejos');
    expect(resolveRedirect('/categoria/comodas', offIndex)).toBe('/catalogo');
    expect(resolveRedirect('/consolas', offIndex)).toBe('/catalogo');
  });

  it('falls back to the catalogue while the section of its kind is not public', () => {
    for (const visibility of ['unlisted', 'off']) {
      const hidden = buildRedirectIndex(
        withOff.map((c) => (c.slug === 'espejos' ? { ...c, visibility } : c)),
      );
      expect(resolveRedirect('/otros-modelos/Espejo-Alto-D02', hidden)).toBe('/catalogo');
    }
  });

  it('reads the kind from the name regardless of case, accents and the bar', () => {
    const kinds = buildRedirectIndex([
      { slug: 'espejos', products: [] },
      {
        slug: 'old',
        visibility: 'off',
        products: [
          { id: 'a', name: 'ESPEJO grande' },
          { id: 'b', name: '  Espéjo|LED' },
          { id: 'c', name: '' },
          { id: 'd' },
        ],
      },
    ]);
    expect(kinds.products.get('a').off).toBe('espejos');
    expect(kinds.products.get('b').off).toBe('espejos');
    expect(kinds.products.get('c').off).toBe('catalogo');
    expect(kinds.products.get('d').off).toBe('catalogo');
  });
});

describe('withQuery', () => {
  it('carries the query string of the request over to the target', () => {
    expect(withQuery('/espejos', '/otros-modelos/Espejo-Alto-D02?utm_source=chatgpt.com')).toBe(
      '/espejos?utm_source=chatgpt.com',
    );
    expect(withQuery('/espejos', '/x?fbclid=abc&utm_medium=social')).toBe(
      '/espejos?fbclid=abc&utm_medium=social',
    );
  });

  it('leaves a request without one as it is', () => {
    expect(withQuery('/espejos', '/otros-modelos/Espejo-Alto-D02')).toBe('/espejos');
  });
});
