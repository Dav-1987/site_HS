/**
 * Real-browser regression check for the prerender/client boundary.
 * Run after build:seo has produced dist/. External analytics requests are
 * blocked so the check is deterministic and never pollutes production data.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const catalog = JSON.parse(await readFile(join(ROOT, 'src/data/catalog.default.json'), 'utf8'));
const firstCategory = catalog.find((category) => category.products?.length);
const firstProduct = firstCategory?.products?.[0];

if (!firstCategory || !firstProduct) {
  throw new Error('Hydration check needs at least one product route');
}

const routes = ['/', `/${firstCategory.slug}/${firstProduct.id}`];
const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

async function findStaticFile(pathname) {
  const clean = decodeURIComponent(pathname).replace(/^\/+/, '');
  const candidates = clean
    ? [join(DIST, clean), join(DIST, clean, 'index.html')]
    : [join(DIST, 'index.html')];

  for (const candidate of candidates) {
    const safe = normalize(candidate);
    if (!safe.startsWith(normalize(DIST))) continue;
    try {
      if ((await stat(safe)).isFile()) return safe;
    } catch {}
  }
  return null;
}

const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = await findStaticFile(pathname);
    if (!file) {
      res.writeHead(404).end('Not found');
      return;
    }
    res.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream');
    res.end(await readFile(file));
  } catch (error) {
    res.writeHead(500).end(error.message);
  }
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});

const { port } = server.address();
const origin = `http://127.0.0.1:${port}`;
let browser;

function luminance([r, g, b]) {
  const values = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}

function contrastRatio(foreground, background) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

try {
  browser = await puppeteer.launch({
    headless: true,
    // GitHub-hosted runners disable the user namespaces Chromium's sandbox
    // expects. Keep the normal sandbox locally and relax it only inside CI.
    ...(process.env.CI
      ? { args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] }
      : {}),
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  const hydrationErrors = [];

  page.on('pageerror', (error) => hydrationErrors.push(error.message));
  page.on('console', (message) => {
    const text = message.text();
    if (/\[hydrate\]|hydration (?:failed|mismatch)|target .*not found/i.test(text)) {
      hydrationErrors.push(text);
    }
  });

  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (request.url().startsWith(origin)) request.continue();
    else request.abort();
  });

  for (const route of routes) {
    hydrationErrors.length = 0;
    await page.goto(`${origin}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.documentElement.dataset.clientReady === 'true', {
      timeout: 15_000,
    });

    const counts = await page.evaluate(() => ({
      title: document.querySelectorAll('title').length,
      canonical: document.querySelectorAll('link[rel="canonical"]').length,
      description: document.querySelectorAll('meta[name="description"]').length,
      prerenderPath: document.getElementById('root')?.dataset.prerenderPath,
    }));

    for (const [name, count] of Object.entries(counts).filter(
      ([name]) => name !== 'prerenderPath',
    )) {
      if (count !== 1) throw new Error(`${route}: expected one ${name}, found ${count}`);
    }
    if (counts.prerenderPath !== route) {
      throw new Error(`${route}: served prerender path ${counts.prerenderPath ?? 'missing'}`);
    }
    if (hydrationErrors.length) {
      throw new Error(`${route}: hydration errors:\n${hydrationErrors.join('\n')}`);
    }

    const undersizedTargets = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.touch-target'))
        .filter((element) => element.getClientRects().length > 0)
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            label: element.getAttribute('aria-label') || element.textContent.trim(),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        })
        .filter(({ width, height }) => width < 44 || height < 44),
    );
    if (undersizedTargets.length) {
      throw new Error(`${route}: undersized touch targets ${JSON.stringify(undersizedTargets)}`);
    }

    if (route === '/') {
      const colors = await page.evaluate(() => {
        const styles = getComputedStyle(document.documentElement);
        const read = (name) => styles.getPropertyValue(name).trim().split(/\s+/).map(Number);
        return {
          background: read('--color-background'),
          secondary: read('--color-secondary'),
          accentText: read('--color-accent-text'),
        };
      });
      for (const [name, color] of Object.entries({
        secondary: colors.secondary,
        accentText: colors.accentText,
      })) {
        const ratio = contrastRatio(color, colors.background);
        if (ratio < 4.5) throw new Error(`${name} contrast is ${ratio.toFixed(2)}:1`);
      }
    }

    if (route !== '/') {
      await page.focus('button[aria-label^="Ampliar"]');
      await page.keyboard.press('Enter');
      await page.waitForSelector('[role="dialog"][aria-modal="true"]');
      await page.keyboard.press('Escape');
      await page.waitForSelector('[role="dialog"][aria-modal="true"]', { hidden: true });

      await page.evaluate(() => {
        const orderButton = Array.from(document.querySelectorAll('button')).find((button) =>
          button.textContent.includes('PEDIR AHORA'),
        );
        orderButton?.click();
      });
      await page.waitForSelector('[role="dialog"][aria-modal="true"] form');

      const labelledFields = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll(
            '[role="dialog"][aria-modal="true"] input:not([name="_gotcha"]), [role="dialog"][aria-modal="true"] textarea',
          ),
        ).every(
          (field) => field.id && document.querySelector(`label[for="${CSS.escape(field.id)}"]`),
        ),
      );
      if (!labelledFields) throw new Error(`${route}: order fields are not associated with labels`);

      await page.evaluate(() =>
        document.querySelector('[role="dialog"][aria-modal="true"] form')?.requestSubmit(),
      );
      await page.waitForSelector('[role="dialog"][aria-modal="true"] [role="alert"]');
      const describedErrors = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll('[role="dialog"][aria-modal="true"] [aria-invalid="true"]'),
        ).every((field) => {
          const id = field.getAttribute('aria-describedby');
          return id && document.getElementById(id)?.getAttribute('role') === 'alert';
        }),
      );
      if (!describedErrors) throw new Error(`${route}: validation errors are not announced`);
    }
    console.log(`  OK ${route} — one title, canonical and description`);
  }
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
