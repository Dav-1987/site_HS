// Pull the LIVE catalog (edited via /admin, stored in the VPS PostgreSQL DB)
// down into src/data/catalog.default.json so local work reflects production
// data and the bundled fallback stays fresh.
//
// Usage:
//   npm run catalog:pull                       (uses the default production URL)
//   node scripts/pull-catalog.mjs <site-url>   (override the URL)

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const DEFAULT_URL = 'http://185.202.172.59';

const base = (process.argv[2] || DEFAULT_URL).replace(/\/$/, '');
const target = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/catalog.default.json');

const res = await fetch(`${base}/api/catalog`);
if (!res.ok) {
  console.error(`✗ Failed to fetch ${base}/api/catalog — HTTP ${res.status}`);
  process.exit(1);
}

const data = await res.json();
if (!Array.isArray(data?.categories)) {
  console.error('✗ Unexpected response shape (no categories array).');
  process.exit(1);
}

await writeFile(target, `${JSON.stringify(data.categories, null, 2)}\n`, 'utf8');

const productCount = data.categories.reduce((n, c) => n + (c.products?.length ?? 0), 0);
console.log(`✓ Pulled ${data.categories.length} categories / ${productCount} products from ${base}`);
console.log(`  → ${target}`);
