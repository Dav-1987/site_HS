import { describe, it, expect } from 'vitest';
import { buildProductIndex, resolveRedirect } from './redirects.js';

const catalog = [
  { slug: 'tocadores', products: [{ id: 'Tocador-T-04' }] },
  { slug: 'otros-modelos', products: [{ id: 'Comoda-B01' }, { id: 'Tocador-T-01' }] },
];
const index = buildProductIndex(catalog);

describe('buildProductIndex', () => {
  it('maps every product id to its category slug', () => {
    expect(index.get('Tocador-T-04')).toBe('tocadores');
    expect(index.get('Comoda-B01')).toBe('otros-modelos');
    expect(index.size).toBe(3);
  });

  it('tolerates a missing or malformed catalog', () => {
    expect(buildProductIndex(null).size).toBe(0);
    expect(buildProductIndex([{ slug: 'x' }, { slug: 'y', products: [null] }]).size).toBe(0);
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
    expect(resolveRedirect('/tocadores/Tocador-T-04', index)).toBeNull();
    expect(resolveRedirect('/en/otros-modelos/Comoda-B01', index)).toBeNull();
  });

  it('ignores non-catalog and unknown paths', () => {
    expect(resolveRedirect('/', index)).toBeNull();
    expect(resolveRedirect('/contacto', index)).toBeNull();
    expect(resolveRedirect('/tocadores/ghost-id', index)).toBeNull();
    expect(resolveRedirect('/producto/ghost-id', index)).toBeNull();
    expect(resolveRedirect('/a/b/c', index)).toBeNull();
  });

  it('redirects the legacy /categoria/<slug> form in one hop', () => {
    expect(resolveRedirect('/categoria/tocadores', index)).toBe('/tocadores');
    expect(resolveRedirect('/categoria/comodas', index)).toBe('/otros-modelos');
  });

  it('redirects the legacy /producto/<id> form to the canonical URL', () => {
    expect(resolveRedirect('/producto/Comoda-B01', index)).toBe('/otros-modelos/Comoda-B01');
  });
});
