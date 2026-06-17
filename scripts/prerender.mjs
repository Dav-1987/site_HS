/**
 * Prerender script — builds static HTML snapshots of every SPA route.
 *
 * Browserless: instead of driving Puppeteer, it renders the React tree to a
 * string through Vite's SSR pipeline (react-dom/server). Much faster, fully
 * deterministic, and needs no Chromium at build time.
 *
 * Flow:
 *   1. vite build (run separately) produces dist/ incl. the hashed asset tags.
 *   2. createServer (middleware mode) → ssrLoadModule('/src/entry-server.jsx')
 *   3. For each route call render(route) → static markup of the page tree
 *   4. Hoist the page's <title>/<meta>/<link> into the template <head>,
 *      inject the rest into <div id="root">, and write dist/<route>/index.html
 *
 * Run after `vite build`:
 *   node scripts/prerender.mjs
 */

import { build } from 'vite';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');
const SSR_DIR = join(ROOT, 'dist-ssr');

// ── Routes ──────────────────────────────────────────────────────────────────
const catalog = JSON.parse(
  readFileSync(join(ROOT, 'src/data/catalog.default.json'), 'utf8'),
);

const routes = [
  '/',
  '/catalogo',
  '/contacto',
  ...catalog.map((cat) => `/${cat.slug}`),
  ...catalog.flatMap((cat) => cat.products.map((p) => `/${cat.slug}/${p.id}`)),
];

// ── Head hoisting ─────────────────────────────────────────────────────────────
// renderToStaticMarkup emits any <title>/<meta>/<link> the page declares inline
// in the body. Pull them out, deduplicate (last occurrence wins — most specific),
// and return { headTags, body } so they can be placed in the document <head>.
// Matches a full <title>…</title> OR a self-closing/void <meta>/<link> tag.
const HEAD_TAG_RE = /<title>[\s\S]*?<\/title>|<(?:meta|link)\b[^>]*?\/?>/gi;

function keyForTag(full) {
  if (/^<title/i.test(full)) return 'title';
  const attrs = full.replace(/^<\w+\s*/i, '').replace(/\/?>\s*$/, '');
  if (/^<link/i.test(full)) {
    const rel = (attrs.match(/rel="([^"]+)"/i) || [])[1];
    return rel === 'canonical' ? 'link:canonical' : `link:${full}`;
  }
  // meta
  if (/charset/i.test(attrs)) return 'meta:charset';
  const name = (attrs.match(/name="([^"]+)"/i) || [])[1];
  const prop = (attrs.match(/property="([^"]+)"/i) || [])[1];
  if (name) return `meta:name:${name.toLowerCase()}`;
  if (prop) return `meta:prop:${prop.toLowerCase()}`;
  return `meta:${full}`;
}

function extractHead(html) {
  const matches = html.match(HEAD_TAG_RE) || [];
  const seen = new Set();
  const headTags = [];
  // Walk in reverse so the LAST occurrence of each unique tag wins.
  for (let i = matches.length - 1; i >= 0; i--) {
    const full = matches[i];
    const key = keyForTag(full);
    if (seen.has(key)) continue;
    seen.add(key);
    headTags.unshift(full);
  }
  const body = html.replace(HEAD_TAG_RE, '');
  return { headTags, body };
}

// ── Compose final document ────────────────────────────────────────────────────
function compose(template, appHtml) {
  const { headTags, body } = extractHead(appHtml);
  let out = template;

  // If the page sets its own <title>, drop the shell <title> from the template.
  if (headTags.some((t) => /^<title/i.test(t))) {
    out = out.replace(/<title>.*?<\/title>/is, '');
  }

  // Inject hoisted head tags just before </head>.
  out = out.replace(/<\/head>/i, `${headTags.join('\n    ')}\n  </head>`);

  // Inject the rendered page into #root.
  out = out.replace(
    /<div id="root">\s*<\/div>/i,
    `<div id="root">${body}</div>`,
  );
  return out;
}

// ── Save rendered HTML ────────────────────────────────────────────────────────
function saveRoute(route, html) {
  if (route === '/') {
    writeFileSync(join(DIST, 'index.html'), html, 'utf8');
    return;
  }
  const dir = join(DIST, route);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html, 'utf8');
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`🚀 Prerendering ${routes.length} routes (no browser)`);

  // Read the freshly-built client template ONCE, before we overwrite index.html.
  const template = readFileSync(join(DIST, 'index.html'), 'utf8');

  // Bundle the server entry with Rollup (handles CJS interop for react-router
  // correctly, unlike on-the-fly ssrLoadModule). Routers are bundled in;
  // react/react-dom stay external and load fine under Node's ESM loader.
  await build({
    root: ROOT,
    logLevel: 'warn',
    ssr: { noExternal: ['react-router', 'react-router-dom'] },
    build: {
      ssr: 'src/entry-server.jsx',
      outDir: 'dist-ssr',
      emptyOutDir: true,
      rollupOptions: { output: { entryFileNames: 'entry-server.mjs' } },
    },
  });

  const { render } = await import(pathToFileURL(join(SSR_DIR, 'entry-server.mjs')).href);

  let ok = 0;
  let fail = 0;
  for (const route of routes) {
    try {
      const appHtml = render(route);
      saveRoute(route, compose(template, appHtml));
      ok++;
      process.stdout.write(`  ✅ ${route}\n`);
    } catch (err) {
      fail++;
      process.stdout.write(`  ⚠️  ${route} — ${err.message}\n`);
    }
  }

  // Tidy up the throwaway SSR bundle.
  rmSync(SSR_DIR, { recursive: true, force: true });

  console.log(`\n🏁 Prerender complete — ${ok} ok, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
