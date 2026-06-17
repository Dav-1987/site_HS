import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '../dist');
const SITE = 'https://hsmuebles.es';

const catalog = JSON.parse(
  readFileSync(join(__dirname, '../src/data/catalog.default.json'), 'utf8'),
);

const today = new Date().toISOString().split('T')[0];

const staticRoutes = [
  { url: '/', priority: '1.0', changefreq: 'weekly' },
  { url: '/catalogo', priority: '0.9', changefreq: 'weekly' },
  { url: '/contacto', priority: '0.6', changefreq: 'monthly' },
];

const categoryRoutes = catalog.map((cat) => ({
  url: `/${cat.slug}`,
  priority: '0.8',
  changefreq: 'weekly',
}));

const productRoutes = catalog.flatMap((cat) =>
  cat.products.map((p) => ({
    url: `/${cat.slug}/${p.id}`,
    priority: '0.7',
    changefreq: 'monthly',
  })),
);

const allRoutes = [...staticRoutes, ...categoryRoutes, ...productRoutes];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes
  .map(
    (r) => `  <url>
    <loc>${SITE}${r.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`;

writeFileSync(join(DIST, 'sitemap.xml'), xml, 'utf8');
console.log(`✅ sitemap.xml — ${allRoutes.length} URLs`);
