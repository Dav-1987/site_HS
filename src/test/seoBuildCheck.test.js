import { describe, expect, it } from 'vitest';
import { validateSeoPage } from '../../scripts/seo-build-check.js';

const expected = {
  loc: 'https://hsmuebles.es/catalogo',
  alternates: [
    { hreflang: 'es', href: 'https://hsmuebles.es/catalogo' },
    { hreflang: 'en', href: 'https://hsmuebles.es/en/catalogo' },
    { hreflang: 'x-default', href: 'https://hsmuebles.es/catalogo' },
  ],
};

function validPage(extraHead = '') {
  return `<!doctype html><html lang="es"><head>
    <title>Catálogo | Mirage Muebles</title>
    <meta name="description" content="Todas las colecciones" />
    <link rel="canonical" href="https://hsmuebles.es/catalogo" />
    <link rel="alternate" hreflang="es" href="https://hsmuebles.es/catalogo" />
    <link rel="alternate" hreflang="en" href="https://hsmuebles.es/en/catalogo" />
    <link rel="alternate" hreflang="x-default" href="https://hsmuebles.es/catalogo" />
    ${extraHead}
  </head><body><main><section><h1>Catálogo</h1></section></main></body></html>`;
}

describe('validateSeoPage', () => {
  it('accepts a complete indexable prerender', () => {
    expect(validateSeoPage(validPage(), expected).errors).toEqual([]);
  });

  it('rejects the layout-only fallback that caused duplicate pages', () => {
    const html = validPage().replace('<section><h1>Catálogo</h1></section>', '');
    expect(validateSeoPage(html, expected).errors).toContain('missing rendered <h1> inside <main>');
  });

  it('rejects conflicting canonical and noindex directives', () => {
    const html = validPage('<meta name="robots" content="noindex" />').replace(
      '<link rel="canonical" href="https://hsmuebles.es/catalogo" />',
      '<link rel="canonical" href="https://www.hsmuebles.es/catalogo" />',
    );
    const errors = validateSeoPage(html, expected).errors;
    expect(errors).toContain('canonical is https://www.hsmuebles.es/catalogo, expected https://hsmuebles.es/catalogo');
    expect(errors).toContain('sitemap page contains noindex');
  });
});
