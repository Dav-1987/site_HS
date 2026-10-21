/**
 * shot-admin.mjs — screenshots of the admin panel, without a password.
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
// One demo order per stage, so the screenshot shows the «Заявки» groups.
const demoOrder = (id, status, hoursAgo, extra = {}) => ({
  id,
  name: `Demo Cliente ${id}`,
  phone: `+3460000000${id}`,
  createdAt: new Date(Date.now() - hoursAgo * 36e5).toISOString(),
  productName: 'Espejo Hollywood blanco',
  productId: 'Espejo-Alto-F-05',
  price: 239,
  country: 'ES',
  postalCode: '28001',
  address: 'Calle Demo 1',
  comment: '',
  telegramSent: true,
  emailSent: false,
  status,
  note: '',
  attributionLabel: 'instagram / cpc',
  entry: '/tocadores',
  device: '📱 iPhone · Instagram (app)',
  ...extra,
});
const ORDERS = [
  demoOrder(1, 'new', 1, { comment: 'Demo-заявка для снимка вёрстки.' }),
  demoOrder(2, 'new', 3, { telegramSent: false }),
  demoOrder(3, 'called', 26, { note: 'Demo: перезвонить после 18:00' }),
  demoOrder(4, 'confirmed', 50, { note: 'Demo: доставка в пятницу' }),
  demoOrder(5, 'delivered', 200),
  demoOrder(6, null, 900),
];
// «Подробности визита» of demo order 1, which came in an hour ago.
const visitAt = (minutesBefore) => new Date(Date.now() - 36e5 - minutesBefore * 60e3).toISOString();
const DEMO_VISIT = {
  start: visitAt(6),
  orderAt: visitAt(0),
  entryUrl:
    'https://hsmuebles.es/?utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=DEMOxEXAMPLExCLICKxIDx0123456789abcdefDEMOxEXAMPLExCLICKxIDx0123456789',
  entryReferrer: 'https://l.instagram.com/',
  events: [
    { type: 'page', at: visitAt(6), path: '/', label: 'Главная' },
    { type: 'page', at: visitAt(5), path: '/espejos', label: 'Категория «Espejos»' },
    {
      type: 'page',
      at: visitAt(4),
      path: '/espejos/Espejo-Alto-F-05',
      label: 'Товар «Espejo Hollywood blanco 80 × 180 cm»',
    },
    { type: 'photos', at: visitAt(3), count: 4, total: 9 },
    { type: 'order', at: visitAt(0) },
  ],
  earlierVisits: [
    {
      start: new Date(Date.now() - 3 * 864e5).toISOString(),
      end: new Date(Date.now() - 3 * 864e5 + 120e3).toISOString(),
      pages: ['Главная', 'Категория «Tocadores»'],
      ordered: false,
    },
  ],
  earlierCount: 1,
  provider: { name: 'Demo ISP', domain: 'example.net' },
};
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
    '/api/orders/1/visit': { visit: DEMO_VISIT },
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

  // Section links: the sidebar on desktop, the strip under the toolbar on a phone.
  const openSection = (text) =>
    page.evaluate((t) => {
      const el = [...document.querySelectorAll('nav a')].find((a) => a.innerText.includes(t));
      if (!el) throw new Error(`section link not found: ${t}`);
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

  // A row's "⋯" is labelled with its product ("Действия с товаром F-05").
  const clickByLabelPrefix = (prefix) =>
    page.evaluate((p) => {
      const el = document.querySelector(`button[aria-label^="${p}"]`);
      if (!el) throw new Error(`button not found: ${p}…`);
      el.scrollIntoView({ block: 'center' });
      el.click();
    }, prefix);

  const clickTab = (name) =>
    page.evaluate((n) => {
      const el = [...document.querySelectorAll('[role="tab"]')].find((t) =>
        t.innerText.startsWith(n),
      );
      if (!el) throw new Error(`tab not found: ${n}`);
      el.click();
    }, name);

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
  await shot('02-list');
  report.push(await measure('02-list'));

  // A row's actions live behind its "⋯".
  await clickByLabelPrefix('Действия с товаром');
  await settle(400);
  await shot('03-row-menu');
  await page.keyboard.press('Escape');
  await settle(300);

  // The first product opens in the side panel (full screen on a phone).
  await page.evaluate(() => document.querySelector('main li a[href*="product="]').click());
  await settle(800);
  await shot('04-product-open');
  report.push(await measure('04-product-open'));

  await clickTab('Фото и видео');
  await settle(600);
  await shot('05-photos');

  // Tapping a tile is the phone's replacement for hover + drag.
  if (await clickByLabel('Действия: фото 2')) {
    await settle(400);
    await shot('06-photo-menu');
    await page.keyboard.press('Escape');
    await settle(300);
  }

  await clickByLabel('Закрыть товар');
  await settle(500);
  await page.type('input[type="search"]', 'blanco');
  await settle(600);
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot('07-search');
  report.push(await measure('07-search'));

  await clickByText('Сбросить поиск');
  await settle(400);
  await clickByText('Настройки категории');
  await settle(700);
  await shot('08-category-settings');
  await clickByLabel('Закрыть настройки категории');
  await settle(400);

  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(300);
  // At phone width the rebuild and the way out are behind "⋯"; on desktop
  // they're in the toolbar and the sidebar.
  if (await clickByLabel('Меню админки')) {
    await settle(300);
    await shot('09-toolbar-menu');
    await page.keyboard.press('Escape');
    await settle(300);
  }

  await openSection('Заявки');
  await settle(700);
  await shot('10-orders');
  report.push(await measure('10-orders'));

  await clickByText('Подробности визита');
  await settle(500);
  await shot('10b-order-visit');
  report.push(await measure('10b-order-visit'));

  await openSection('Главная');
  await settle(700);
  await shot('11-home');
  report.push(await measure('11-home'));

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
