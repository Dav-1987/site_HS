// Shared Spanish route table — single source of truth consumed by both
// scripts/prerender.mjs and scripts/generate-sitemap.mjs. Previously each
// script hardcoded its own copy of this list, which is exactly how "9
// colecciones" and the sitemap's fixed lastmod drifted from reality — one
// script got updated, the other didn't. English routes are derived from
// these via withLang() rather than listed separately, for the same reason.

import { liveCatalog } from './data/catalog.js';
import { GUIDES_SLUG } from './data/guides.js';

// The latest of the given ISO dates, or undefined when there is none.
const latest = (dates) => dates.filter(Boolean).sort().at(-1);

// The «Guías» section: its page while anything is published (with nothing to
// list it has no page, and /guias answers 404), and one page per article —
// `guides` is the published list scripts/pull-guides.mjs wrote. An article's
// updatedAt is its own last edit in /admin, which is what IndexNow reads off
// the sitemap; the section page changes whenever any article does.
function guideRoutes(guides) {
  if (!guides?.length) return [];
  return [
    {
      path: `/${GUIDES_SLUG}`,
      priority: '0.6',
      changefreq: 'weekly',
      updatedAt: latest(guides.map((g) => g.updatedAt)),
    },
    ...guides.map((g) => ({
      path: `/${GUIDES_SLUG}/${g.slug}`,
      priority: '0.6',
      changefreq: 'monthly',
      updatedAt: g.updatedAt ?? undefined,
    })),
  ];
}

// Sections and products switched off in /admin have no route at all: no
// prerendered snapshot (so the request falls through to the server, which
// 301s it to a similar open section — see server/redirects.js) and no sitemap
// entry. Unlisted ones keep both — the whole point of that state is that the
// page stays live and indexed, it just isn't linked to from anywhere.
export function buildRoutes(rawCatalog, settings, guides = []) {
  const catalog = liveCatalog(rawCatalog);
  // Раздел отзывов выключается тумблером в /admin. Выключенный — не получает
  // ни пререндер-снимок (значит SPA-фолбэк отдаст честный 404), ни строку в
  // sitemap. Выключенные категории ведут себя так же, только их адреса сервер
  // ещё и переадресует (server/redirects.js), а у отзывов адрес просто пропадает.
  const reviewsOn = settings?.blocks?.reviews !== false;
  return [
    { path: '/', priority: '1.0', changefreq: 'weekly', catalogAggregate: true },
    { path: '/catalogo', priority: '0.9', changefreq: 'weekly', catalogAggregate: true },
    { path: '/contacto', priority: '0.6', changefreq: 'monthly' },
    { path: '/privacy-policy', priority: '0.3', changefreq: 'yearly' },
    { path: '/legal-notice', priority: '0.3', changefreq: 'yearly' },
    // Required by Merchant Center. Prerendered and in the sitemap so a crawler
    // gets a real 200; deliberately not linked from anywhere on the site yet.
    { path: '/envios', priority: '0.3', changefreq: 'yearly' },
    { path: '/devoluciones', priority: '0.3', changefreq: 'yearly' },
    ...(reviewsOn ? [{ path: '/opiniones', priority: '0.5', changefreq: 'weekly' }] : []),
    ...guideRoutes(guides),
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
