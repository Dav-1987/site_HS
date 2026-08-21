import { describe, it, expect } from 'vitest';
import { buildRoutes } from './routes.js';

// cat(slug, ...products) where a product is either an id or [id, visibility]
const cat = (slug, visibility, ...products) => ({
  slug,
  visibility,
  updatedAt: '2026-08-01T00:00:00.000Z',
  products: products.map((p) =>
    Array.isArray(p)
      ? { id: p[0], visibility: p[1], updatedAt: '2026-08-01T00:00:00.000Z' }
      : { id: p, updatedAt: '2026-08-01T00:00:00.000Z' },
  ),
});

const paths = (catalog) => buildRoutes(catalog).map((r) => r.path);

describe('buildRoutes', () => {
  it('lists the static pages plus every category and product', () => {
    expect(paths([cat('c1', undefined, 'p1', 'p2')])).toEqual([
      '/',
      '/catalogo',
      '/contacto',
      '/privacy-policy',
      '/legal-notice',
      '/c1',
      '/c1/p1',
      '/c1/p2',
    ]);
  });

  it('keeps unlisted sections and products — they stay live and indexed', () => {
    const out = paths([cat('c1', 'unlisted', 'p1', ['p2', 'unlisted'])]);
    expect(out).toContain('/c1');
    expect(out).toContain('/c1/p1');
    expect(out).toContain('/c1/p2');
  });

  it('drops an off product but keeps the rest of its section', () => {
    const out = paths([cat('c1', undefined, 'p1', ['p2', 'off'])]);
    expect(out).toContain('/c1');
    expect(out).toContain('/c1/p1');
    expect(out).not.toContain('/c1/p2');
  });

  it('drops an off section together with all of its products', () => {
    const out = paths([cat('c1', 'off', 'p1'), cat('c2', undefined, 'p2')]);
    expect(out).not.toContain('/c1');
    expect(out).not.toContain('/c1/p1');
    expect(out).toContain('/c2');
    expect(out).toContain('/c2/p2');
  });
});
