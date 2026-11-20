// Browser smoke check for the two optional home navigation links.
import puppeteer from 'puppeteer';
import { readFileSync } from 'node:fs';

const settings = JSON.parse(
  readFileSync(new URL('../src/data/settings.default.json', import.meta.url)),
);
const catalog = JSON.parse(
  readFileSync(new URL('../src/data/catalog.default.json', import.meta.url)),
);
settings.homeNavigation = { catalogScroll: true, contactsScroll: true };
catalog[0].products[0].onHomeCatalog = true;

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const path = new URL(request.url()).pathname;
      if (path === '/api/settings') {
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ settings }),
        });
      } else if (path === '/api/catalog') {
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ categories: catalog }),
        });
      } else {
        request.continue();
      }
    });
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle2' });
    if (width === 390) await page.click('header button[aria-label="Menú"]');
    const nav = width === 390 ? 'header nav.flex.flex-col' : 'header nav.hidden';
    const catalogLink = await page.evaluate(
      (selector) =>
        [...document.querySelectorAll(`${selector} a`)]
          .find((a) => a.textContent.trim() === 'Catálogo')
          ?.getAttribute('href'),
      nav,
    );
    if (catalogLink !== '/#home-catalog') throw new Error(`${width}: catalog href ${catalogLink}`);
    await page.click(`${nav} a[href="/#home-catalog"]`);
    await new Promise((resolve) => setTimeout(resolve, 1800));
    const catalogTop = await page.$eval('#home-catalog', (el) => el.getBoundingClientRect().top);
    if (catalogTop < 0 || catalogTop > 250) throw new Error(`${width}: catalog top ${catalogTop}`);
    if (width === 390) await page.click('header button[aria-label="Menú"]');
    await page.click(`${nav} a[href="/#home-contacts"]`);
    await new Promise((resolve) => setTimeout(resolve, 1800));
    const footerTop = await page.$eval('#home-contacts', (el) => el.getBoundingClientRect().top);
    if (footerTop < 0 || footerTop > 500) throw new Error(`${width}: footer top ${footerTop}`);
    console.log(`${width}px: catalog and contacts scroll passed`);
    await page.close();
  }
} finally {
  await browser.close();
}
