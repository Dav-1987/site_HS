/**
 * screenshot.mjs — Design verification screenshots (Puppeteer)
 * https://pptr.dev/
 *
 * WORKFLOW RULE (see CLAUDE.md → Screenshot Workflow):
 *   ✅ Run after creating/modifying any DESIGN (static UI: pages, components, layouts).
 *   ❌ Do NOT use for ANIMATIONS — a still frame cannot capture motion.
 *      (GSAP reveals, Lenis scroll, hover transitions → verify in the live browser instead.)
 *
 * Usage:
 *   node screenshot.mjs [url] [name] [--mobile-only|--desktop-only] [--no-full]
 *
 * Examples:
 *   node screenshot.mjs                                  # http://localhost:3000, both viewports
 *   node screenshot.mjs http://localhost:5173 home       # custom url + label
 *   node screenshot.mjs http://localhost:3000 card --desktop-only
 *
 * Output: ./screenshots/<name>-<viewport>-<timestamp>.png
 */

import puppeteer from 'puppeteer';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'screenshots');

// --- Parse args ---------------------------------------------------------
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const positional = args.filter((a) => !a.startsWith('--'));

const url = positional[0] || 'http://localhost:3000';
const name = (positional[1] || 'design').replace(/[^a-z0-9_-]/gi, '_');
const fullPage = !flags.has('--no-full');

// Mobile-first: capture both unless restricted (DESIGN_SYSTEM.md is mobile-first).
// NOTE: `isMobile: true` combined with deviceScaleFactor > 1 makes Puppeteer's
// full-page capture tile the page N× (N = deviceScaleFactor). Responsive layout
// is driven by viewport WIDTH (Tailwind breakpoints), not the isMobile flag, so
// we emulate the narrow width at a crisp 2× scale without isMobile.
const VIEWPORTS = [
  { id: 'desktop', width: 1440, height: 900, deviceScaleFactor: 2, isMobile: false },
  { id: 'mobile', width: 390, height: 844, deviceScaleFactor: 2, isMobile: false },
];
let viewports = VIEWPORTS;
if (flags.has('--mobile-only')) viewports = VIEWPORTS.filter((v) => v.id === 'mobile');
if (flags.has('--desktop-only')) viewports = VIEWPORTS.filter((v) => v.id === 'desktop');

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

// --- Run ----------------------------------------------------------------
async function run() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const saved = [];
  try {
    for (const vp of viewports) {
      const page = await browser.newPage();
      await page.setViewport({
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.deviceScaleFactor,
        isMobile: vp.isMobile,
        hasTouch: vp.isMobile,
      });

      // Capture the FINAL state of scroll-reveal animations: emulating
      // reduced motion makes GSAP reveals render their resolved (visible)
      // state immediately and disables smooth-scroll hijacking — so a static
      // full-page shot shows the real layout instead of pre-animation blanks.
      await page.emulateMediaFeatures([
        { name: 'prefers-reduced-motion', value: 'reduce' },
      ]);

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Pass through the whole page to force lazy-loaded images to fetch,
      // then return to the top. (Reveal animations are already resolved via
      // reduced-motion emulation above.)
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let y = 0;
          const step = window.innerHeight * 0.8;
          const timer = setInterval(() => {
            window.scrollTo(0, y);
            y += step;
            if (y >= document.body.scrollHeight) {
              clearInterval(timer);
              window.scrollTo(0, 0);
              resolve();
            }
          }, 120);
        });
      });

      // Wait for every <img> to finish decoding (or fail) so nothing is blank.
      await page.evaluate(async () => {
        const imgs = Array.from(document.images);
        await Promise.all(
          imgs.map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise((res) => {
                  img.addEventListener('load', res, { once: true });
                  img.addEventListener('error', res, { once: true });
                }),
          ),
        );
      });
      await new Promise((r) => setTimeout(r, 400));

      const file = join(OUT_DIR, `${name}-${vp.id}-${timestamp}.png`);
      await page.screenshot({ path: file, fullPage });
      saved.push(file);
      console.log(`✅ ${vp.id.padEnd(7)} → ${file}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log(`\n📸 ${saved.length} screenshot(s) of ${url}`);
}

run().catch((err) => {
  console.error('❌ Screenshot failed:', err.message);
  console.error('   Is the dev server running at the given URL?');
  process.exit(1);
});
