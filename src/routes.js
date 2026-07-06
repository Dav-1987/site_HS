// Shared Spanish route table — single source of truth consumed by both
// scripts/prerender.mjs and scripts/generate-sitemap.mjs. Previously each
// script hardcoded its own copy of this list, which is exactly how "9
// colecciones" and the sitemap's fixed lastmod drifted from reality — one
// script got updated, the other didn't. English routes are derived from
// these via withLang() rather than listed separately, for the same reason.

export function buildRoutes(catalog) {
  return [
    { path: '/', priority: '1.0', changefreq: 'weekly', catalogAggregate: true },
    { path: '/catalogo', priority: '0.9', changefreq: 'weekly', catalogAggregate: true },
    { path: '/contacto', priority: '0.6', changefreq: 'monthly' },
    { path: '/privacy-policy', priority: '0.3', changefreq: 'yearly' },
    { path: '/legal-notice', priority: '0.3', changefreq: 'yearly' },
    ...catalog.map((cat) => ({
      path: `/${cat.slug}`,
      priority: '0.8',
      changefreq: 'weekly',
      updatedAt: cat.updatedAt,
    })),
    ...catalog.flatMap((cat) =>
      cat.products.map((p) => ({
        path: `/${cat.slug}/${p.id}`,
        priority: '0.7',
        changefreq: 'monthly',
        updatedAt: p.updatedAt,
      })),
    ),
  ];
}
