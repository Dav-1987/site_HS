import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildRoutes } from '../src/routes.js';
import { withLang } from '../src/i18n/routing.js';
import { assertSeoBuild } from './seo-build-check.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '../dist');
const SITE = 'https://hsmuebles.es';

const catalog = JSON.parse(
  readFileSync(join(__dirname, '../src/data/catalog.default.json'), 'utf8'),
);
// Только ради выключателей разделов — см. src/routes.js.
const settings = JSON.parse(
  readFileSync(join(__dirname, '../src/data/settings.default.json'), 'utf8'),
);

// Real per-row modification time (see server/store.js writeCatalog), pulled
// down into catalog.default.json by scripts/pull-catalog.mjs. Older pulls
// taken before that column existed won't have it — fall back to undefined
// (omit <lastmod> rather than fabricate a date; Google prefers no lastmod
// over an inaccurate one).
const isoDate = (d) => (d ? new Date(d).toISOString().split('T')[0] : undefined);

const routes = buildRoutes(catalog, settings);

const allTimestamps = routes.map((r) => r.updatedAt).filter(Boolean);
// / and /catalogo surface the whole catalog, so they're "modified" whenever
// any category/product last changed.
const latestCatalogChange = allTimestamps.length
  ? isoDate(allTimestamps.reduce((max, t) => (t > max ? t : max)))
  : undefined;

// Every ES route (English has no separate content of its own, just a mirror
// URL — see src/i18n/routing.js) becomes two <url> entries, ES and EN, each
// pointing at both language versions via hreflang alternates so Google treats
// them as translations of one page rather than duplicate/unrelated content.
function urlEntry(route, lang) {
  const lastmod = route.catalogAggregate ? latestCatalogChange : isoDate(route.updatedAt);
  return {
    loc: `${SITE}${withLang(route.path, lang)}`,
    lastmod,
    changefreq: route.changefreq,
    priority: route.priority,
    alternates: [
      { hreflang: 'es', href: `${SITE}${route.path}` },
      { hreflang: 'en', href: `${SITE}${withLang(route.path, 'en')}` },
      { hreflang: 'x-default', href: `${SITE}${route.path}` },
    ],
  };
}

const allUrls = routes.flatMap((r) => [urlEntry(r, 'es'), urlEntry(r, 'en')]);

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${allUrls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
${u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : ''}    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
${u.alternates.map((a) => `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.href}"/>`).join('\n')}
  </url>`,
  )
  .join('\n')}
</urlset>
`;

const report = assertSeoBuild(DIST, allUrls);
writeFileSync(join(DIST, 'sitemap.xml'), xml, 'utf8');
console.log(`✅ sitemap.xml — ${allUrls.length} URLs`);
console.log(`✅ SEO build gate — ${report.checked} prerendered pages validated`);
