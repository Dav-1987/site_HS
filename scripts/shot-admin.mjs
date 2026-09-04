/**
 * shot-admin.mjs — mobile screenshots of the admin panel, without a password.
 *
 * The admin lives behind a session cookie and `npm run dev` proxies /api to the
 * production VPS, so a plain screenshot run only ever lands on the login screen.
 * This script answers the admin's API calls locally instead, from the repo's own
 * fixtures (src/data/*.default.json — the last `data:pull` from production), so
 * the real components render with real catalog data:
 *
 *   - every non-GET /api/* request is answered in-process, so a screenshot run
 *     can never write to the live catalog;
 *   - /uploads/* is re-pointed at https://hsmuebles.es, so the photos are the
 *     real ones (the dev proxy reaches the VPS by IP, and nginx there routes by
 *     host, so uploads 404 through it).
 *
 * Usage:  node scripts/shot-admin.mjs [--desktop] [--url http://localhost:3000]
 * Output: ./screenshots/admin-<state>-<viewport>-<timestamp>.png
 *         ./screenshots/admin-metrics-<timestamp>.json
 */

import puppeteer from 'puppeteer';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'screenshots');

const args = process.argv.slice(2);
const urlArg = args.indexOf('--url');
const BASE = urlArg > -1 ? args[urlArg + 1] : 'http://localhost:3000';
const VIEWPORT = args.includes('--desktop')
  ? { id: 'desktop', width: 1440, height: 900 }
  : { id: 'mobile', width: 390, height: 844 };

const UPLOADS_HOST = 'https://hsmuebles.es';
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const readJson = async (p) => JSON.parse(await readFile(join(ROOT, p), 'utf8'));

// The two panels that have no fixture in the repo get obviously fake rows —
// enough to lay out, nothing that could be mistaken for real customer data.
const ORDERS = [
  {
    id: 'demo-1',
    name: 'Demo Cliente',
    phone: '+34600000000',
    createdAt: new Date().toISOString(),
    productName: 'Espejo Hollywood blanco',
    productId: 'Espejo-Alto-F-05',
    price: 239,
    country: 'ES',
    postalCode: '28001',
    address: 'Calle Demo 1',
    comment: 'Demo-заявка для снимка вёрстки.',
    telegramSent: true,
    emailSent: false,
    attributionLabel: 'instagram / cpc',
  },
];
const VERSIONS = [
  { id: 'v2', createdAt: new Date().toISOString(), categoryCount: 5, productCount: 124 },
  {
    id: 'v1',
    createdAt: new Date(Date.now() - 864e5).toISOString(),
    categoryCount: 5,
    productCount: 123,
  },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const categories = await readJson('src/data/catalog.default.json');
  const settings = await readJson('src/data/settings.default.json');

  const json = (body) => ({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
  const ROUTES = {
    '/api/admin/login': { authed: true },
    '/api/catalog': { categories },
    '/api/settings': { settings },
    '/api/orders': { orders: ORDERS },
    '/api/versions': { versions: VERSIONS },
    '/api/admin/rebuild/status': { configured: true, run: null },
  };

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ ...VIEWPORT, deviceScaleFactor: 2 });
  await page.setRequestInterception(true);

  page.on('request', (req) => {
    const path = new URL(req.url(), BASE).pathname;
    // The dev proxy points at the VPS by IP, and nginx there routes by host —
    // so /uploads/* 404s locally. Send photo requests to the real host instead.
    if (path.startsWith('/uploads/')) return req.continue({ url: `${UPLOADS_HOST}${path}` });
    if (!path.startsWith('/api/')) return req.continue();
    if (req.method() !== 'GET') return req.respond(json({ ok: true }));
    const mock = ROUTES[path];
    return req.respond(mock ? json(mock) : json({}));
  });
  // The draft-restore confirm() would otherwise block the run.
  page.on('dialog', (d) => d.dismiss());
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
  });

  const shots = [];
  const shot = async (state) => {
    const file = join(OUT_DIR, `admin-${state}-${VIEWPORT.id}-${stamp}.png`);
    await page.screenshot({ path: file }); // viewport only = what the phone actually shows
    shots.push(file);
    console.log(`OK  ${state.padEnd(18)} -> ${file}`);
  };

  // innerText reflects text-transform, so the uppercase admin labels only match
  // case-insensitively.
  const clickByText = (text) =>
    page.evaluate((t) => {
      const needle = t.toLowerCase();
      const el = [...document.querySelectorAll('button')].find((b) =>
        b.innerText.toLowerCase().includes(needle),
      );
      if (!el) throw new Error(`button not found: ${t}`);
      el.scrollIntoView({ block: 'center' });
      el.click();
    }, text);

  // Controls that only exist at one width (the "⋯" menus) — returns false
  // instead of throwing when this viewport doesn't have them.
  const clickByLabel = (label) =>
    page.evaluate((l) => {
      const el = document.querySelector(`button[aria-label="${l}"]`);
      if (!el) return false;
      el.scrollIntoView({ block: 'center' });
      el.click();
      return true;
    }, label);

  const settle = (ms = 600) => new Promise((r) => setTimeout(r, ms));

  // What the phone can't show: how far content runs past the right edge, how
  // small the type in a control is (Safari zooms below 16px), and how many
  // controls are under the 44px tap-target minimum.
  const measure = (label) =>
    page.evaluate((lbl) => {
      const vw = document.documentElement.clientWidth;
      const over = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > vw + 1) {
          over.push({
            tag: el.tagName.toLowerCase(),
            cls: String(el.className || '').slice(0, 70),
            right: Math.round(r.right),
            width: Math.round(r.width),
            text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 45),
          });
        }
      }
      const small = [...document.querySelectorAll('button, select, input')]
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            h: Math.round(r.height),
            w: Math.round(r.width),
            text: (el.innerText || el.getAttribute('aria-label') || el.type || '')
              .trim()
              .slice(0, 24),
          };
        })
        .filter((t) => t.h > 0 && (t.h < 44 || t.w < 44));
      const control = document.querySelector('input[type="text"], input:not([type]), select');
      return {
        state: lbl,
        viewportWidth: vw,
        documentScrollWidth: document.documentElement.scrollWidth,
        overflowPx: document.documentElement.scrollWidth - vw,
        overflowingElements: over.length,
        worstOffenders: over.sort((a, b) => b.right - a.right).slice(0, 12),
        controlFontSizePx: control ? parseFloat(getComputedStyle(control).fontSize) : null,
        subMinimumTapTargets: small.length,
        tapTargetSample: small.slice(0, 12),
      };
    }, label);

  const report = [];

  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle2', timeout: 30000 });
  await settle(900);

  await shot('01-top');
  report.push(await measure('01-top'));

  await page.evaluate(() => window.scrollTo(0, 520));
  await settle(300);
  await shot('02-categories');

  await clickByText('тов.'); // first category header
  await settle(700);
  await page.evaluate(() => window.scrollTo(0, 520));
  await settle(300);
  await shot('03-category-open');
  report.push(await measure('03-category-open'));

  await clickByText('Hollywood de cuerpo entero blanco'); // first product header
  await settle(700);
  await shot('04-product-open');
  report.push(await measure('04-product-open'));

  // The product row's own actions live behind "⋯" at phone width.
  await clickByLabel('Действия с товаром');
  await settle(400);
  await shot('05-row-menu');
  await page.keyboard.press('Escape');
  await settle(300);

  await page.evaluate(() => {
    const el = [...document.querySelectorAll('span')].find((s) =>
      s.innerText.toLowerCase().startsWith('фото и видео'),
    );
    if (el) el.scrollIntoView({ block: 'start' });
  });
  await settle(600);
  await shot('06-photos');

  // Tapping a tile is the phone's replacement for hover + drag.
  if (await clickByLabel('Действия: фото 2')) {
    await settle(400);
    await shot('07-photo-menu');
    await page.keyboard.press('Escape');
    await settle(300);
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(300);
  // At phone width the toolbar's buttons are behind "⋯"; on desktop they're
  // in the row itself.
  await clickByLabel('Меню админки');
  await settle(300);
  await clickByText('Заявки');
  await settle(700);
  await shot('08-orders');
  report.push(await measure('08-orders'));

  const reportFile = join(OUT_DIR, `admin-metrics-${stamp}.json`);
  await writeFile(reportFile, JSON.stringify(report, null, 2), 'utf8');
  await browser.close();

  console.log(`\nmetrics -> ${reportFile}`);
  for (const r of report) {
    console.log(
      `   ${r.state.padEnd(18)} overflow ${String(r.overflowPx).padStart(4)}px ` +
        `(${r.overflowingElements} el)  control font ${r.controlFontSizePx}px  ` +
        `tap targets < 44px: ${r.subMinimumTapTargets}`,
    );
  }
  console.log(`\n${shots.length} screenshot(s) of ${BASE}/admin @ ${VIEWPORT.width}px`);
}

main().catch((err) => {
  console.error('shot-admin failed:', err.message);
  console.error('   Is the dev server running? (npm run dev -> http://localhost:3000)');
  process.exit(1);
});
