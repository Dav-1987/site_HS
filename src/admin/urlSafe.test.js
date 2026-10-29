import { describe, it, expect } from 'vitest';
import { urlSafe, RESERVED_SLUGS } from './urlSafe.js';

describe('urlSafe', () => {
  it('turns spaces into hyphens', () => {
    expect(urlSafe('Tocadore T-01')).toBe('Tocadore-T-01');
  });

  it('keeps already-safe ids untouched', () => {
    expect(urlSafe('T-03')).toBe('T-03');
    expect(urlSafe('caj-bea')).toBe('caj-bea');
  });

  it('strips accents and ñ', () => {
    expect(urlSafe('estantería')).toBe('estanteria');
    expect(urlSafe('cañón')).toBe('canon');
  });

  it('drops unsafe characters and collapses repeated hyphens', () => {
    expect(urlSafe('a/b?c#d')).toBe('abcd');
    expect(urlSafe('a  -  b')).toBe('a-b');
    expect(urlSafe('a__b')).toBe('a-b');
  });

  it('lowercases when asked (category slugs)', () => {
    expect(urlSafe('Mesas de Manicura', { lower: true })).toBe('mesas-de-manicura');
  });

  it('handles empty/nullish input', () => {
    expect(urlSafe('')).toBe('');
    expect(urlSafe(null)).toBe('');
    expect(urlSafe(undefined)).toBe('');
  });
});

describe('RESERVED_SLUGS', () => {
  it('covers the static app routes', () => {
    expect(RESERVED_SLUGS).toContain('catalogo');
    expect(RESERVED_SLUGS).toContain('contacto');
    expect(RESERVED_SLUGS).toContain('admin');
    expect(RESERVED_SLUGS).toContain('wallapop');
  });

  // Every fixed page of the site: a category at one of these addresses would
  // never be reached, the route above it wins (see marketingRoutes in App.jsx).
  it('covers the legal, delivery and reviews pages too', () => {
    for (const slug of ['privacy-policy', 'legal-notice', 'envios', 'devoluciones', 'opiniones']) {
      expect(RESERVED_SLUGS).toContain(slug);
    }
  });

  // The server sends every /guias/<anything> to the guides section
  // (server/redirects.js), so a category there would never be reached either.
  it('covers the guides section', () => {
    expect(RESERVED_SLUGS).toContain('guias');
  });
});
