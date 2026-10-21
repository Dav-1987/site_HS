// @vitest-environment node
import { mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { afterEach, describe, expect, it } from 'vitest';

import {
  describeVisit,
  findOrderVisit,
  pageLabel,
  parseLogLine,
  pickOrderLine,
  providerFromHost,
} from './visit.js';

const WINDOWS_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36';
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 26_3_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Mobile/15E148 Safari/604.1';
const IP = '79.153.56.204';

const photo = (n) => n.toString(16).padStart(32, '0');
const MIRROR_PHOTOS = [1, 2, 3, 4, 5, 6].map(photo);
const VANITY_PHOTO = photo(7);

const CATEGORIES = [
  {
    slug: 'espejos',
    name: { es: 'Espejos', en: 'Mirrors' },
    products: [
      {
        id: 'Espejo-Alto-D02',
        name: 'Espejo | Arqueado con marco dorado',
        subtitle: '60 × 170 cm',
        images: MIRROR_PHOTOS.map((k) => `/uploads/${k}.jpg`),
      },
    ],
  },
  {
    slug: 'tocadores',
    name: { es: 'Tocadores', en: 'Vanities' },
    products: [
      { id: 'Tocador-L-05', name: 'Tocador | Hollywood', images: [`/uploads/${VANITY_PHOTO}.jpg`] },
    ],
  },
];

const PAGE = 'https://hsmuebles.es/espejos/Espejo-Alto-D02';

// One access-log line in nginx's combined format, at `time` (UTC).
function log(time, request, { status = 200, referrer = '-', ua = WINDOWS_CHROME, ip = IP } = {}) {
  const d = new Date(`${time}Z`);
  const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${pad(d.getUTCDate())}/${month}/${d.getUTCFullYear()}:${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} +0000`;
  return `${ip} - - [${stamp}] "${request} HTTP/1.1" ${status} 512 "${referrer}" "${ua}"`;
}

// The visit behind order #51: straight onto the product page from ChatGPT,
// a reload, the gallery leafed through, then the order.
const ORDER_VISIT = [
  log('2026-10-01T05:06:46', 'GET /espejos/Espejo-Alto-D02?utm_source=chatgpt.com'),
  log('2026-10-01T05:06:46', 'GET /assets/index-X3DVH4Up.js', { referrer: PAGE }),
  log('2026-10-01T05:06:47', `GET /uploads/${MIRROR_PHOTOS[0]}_1600.webp`, { referrer: PAGE }),
  log('2026-10-01T05:06:47', `GET /uploads/${MIRROR_PHOTOS[1]}_400.webp`, { referrer: PAGE }),
  log('2026-10-01T05:06:47', 'GET /assets/montserrat-latin-400.woff2', {
    referrer: 'https://hsmuebles.es/assets/index-Crbmea0k.css',
  }),
  log('2026-10-01T05:06:48', 'GET /espejos/Espejo-Alto-D02?utm_source=chatgpt.com'),
  log('2026-10-01T05:06:48', `GET /uploads/${VANITY_PHOTO}_800.webp`, { referrer: PAGE }),
  log('2026-10-01T05:06:48', 'GET /api/catalog', { referrer: PAGE }),
  ...MIRROR_PHOTOS.slice(1).map((k, i) =>
    log(`2026-10-01T05:07:5${i}`, `GET /uploads/${k}_1600.webp`, { referrer: PAGE }),
  ),
  log('2026-10-01T05:09:24', 'POST /api/order', { referrer: PAGE }),
];
const ORDER_SAVED_AT = '2026-10-01T05:09:23.344Z';

const lines = (texts) => texts.map(parseLogLine);
const orderLineOf = (parsed) => parsed.find((l) => l.method === 'POST');

describe('parseLogLine', () => {
  it('reads a combined-format line, time zone included', () => {
    const line = parseLogLine(
      `${IP} - - [21/Oct/2026:07:09:24 +0200] "POST /api/order?x=1 HTTP/1.1" 200 11 "${PAGE}" "${WINDOWS_CHROME}"`,
    );
    expect(line).toEqual({
      ip: IP,
      at: Date.parse('2026-10-21T05:09:24Z'),
      method: 'POST',
      target: '/api/order?x=1',
      path: '/api/order',
      status: 200,
      referrer: PAGE,
      userAgent: WINDOWS_CHROME,
    });
  });

  it('skips what is not a request line', () => {
    expect(parseLogLine('')).toBeNull();
    expect(parseLogLine(`${IP} - - [garbage] "-" 400 0 "-" "-"`)).toBeNull();
  });
});

describe('pickOrderLine', () => {
  const at = Date.parse(ORDER_SAVED_AT);
  const mine = { ip: IP, at: at + 700, userAgent: WINDOWS_CHROME };
  const theirs = { ip: '88.1.2.3', at: at + 300, userAgent: IPHONE };

  it('takes the line from the browser the order was sent from', () => {
    expect(pickOrderLine([theirs, mine], WINDOWS_CHROME, at)).toBe(mine);
  });

  it('finds nothing when no line came from that browser', () => {
    expect(pickOrderLine([theirs], WINDOWS_CHROME, at)).toBeNull();
  });

  it('matches an order from before user agents on time alone, only when that is certain', () => {
    expect(pickOrderLine([mine], null, at)).toBe(mine);
    expect(pickOrderLine([theirs, mine], null, at)).toBeNull();
  });
});

describe('describeVisit', () => {
  it('tells the visit from landing to order', () => {
    const parsed = lines(ORDER_VISIT);
    const visit = describeVisit(parsed, orderLineOf(parsed), CATEGORIES);

    expect(visit.start).toBe('2026-10-01T05:06:46.000Z');
    expect(visit.orderAt).toBe('2026-10-01T05:09:24.000Z');
    // ChatGPT sends no Referer, only its utm_source in the link.
    expect(visit.entryUrl).toBe(
      'https://hsmuebles.es/espejos/Espejo-Alto-D02?utm_source=chatgpt.com',
    );
    expect(visit.entryReferrer).toBeNull();
    expect(visit.events).toEqual([
      {
        type: 'page',
        at: '2026-10-01T05:06:46.000Z',
        path: '/espejos/Espejo-Alto-D02',
        label: 'Товар «Espejo Arqueado con marco dorado 60 × 170 cm»',
      },
      // The cover loaded with the page and the other product's card are not
      // counted; the five photos opened a minute later are.
      { type: 'photos', at: '2026-10-01T05:07:50.000Z', count: 5, total: 6 },
      { type: 'order', at: '2026-10-01T05:09:24.000Z' },
    ]);
    expect(visit.earlierVisits).toEqual([]);
    expect(visit.earlierCount).toBe(0);
  });

  it('follows the SPA from page to page by the Referer', () => {
    const category = 'https://hsmuebles.es/espejos';
    const parsed = lines([
      log('2026-10-01T05:00:00', 'GET /'),
      log('2026-10-01T05:00:30', 'GET /api/catalog', { referrer: 'https://hsmuebles.es/' }),
      log('2026-10-01T05:01:00', `GET /uploads/${MIRROR_PHOTOS[0]}_800.webp`, {
        referrer: category,
      }),
      log('2026-10-01T05:02:00', `GET /uploads/${MIRROR_PHOTOS[2]}_1600.webp`, {
        referrer: PAGE,
      }),
      log('2026-10-01T05:03:00', 'POST /api/order', { referrer: PAGE }),
    ]);
    const visit = describeVisit(parsed, orderLineOf(parsed), CATEGORIES);

    expect(visit.events.map((e) => e.label ?? e.type)).toEqual([
      'Главная',
      'Категория «Espejos»',
      'Товар «Espejo Arqueado con marco dorado 60 × 170 cm»',
      'order',
    ]);
  });

  it('keeps the whole entry link and the outside page that sent it', () => {
    const link = '/tocadores/Tocador-L-05?utm_source=ig&utm_medium=social&fbclid=PAZXh0bgNhZW0';
    const parsed = lines([
      log('2026-10-01T05:00:00', `GET ${link}`, { referrer: 'https://l.instagram.com/' }),
      log('2026-10-01T05:01:00', 'GET /tocadores', { referrer: 'https://hsmuebles.es/' }),
      log('2026-10-01T05:02:00', 'POST /api/order', {
        referrer: 'https://hsmuebles.es/tocadores',
      }),
    ]);
    const visit = describeVisit(parsed, orderLineOf(parsed), CATEGORIES);

    expect(visit.entryUrl).toBe(`https://hsmuebles.es${link}`);
    expect(visit.entryReferrer).toBe('https://l.instagram.com/');
  });

  it('names no outside page when the visit started from one of ours', () => {
    const parsed = lines([
      log('2026-10-01T05:00:00', 'GET /tocadores', { referrer: 'https://hsmuebles.es/' }),
      log('2026-10-01T05:02:00', 'POST /api/order', {
        referrer: 'https://hsmuebles.es/tocadores',
      }),
    ]);
    const visit = describeVisit(parsed, orderLineOf(parsed), CATEGORIES);

    expect(visit.entryUrl).toBe('https://hsmuebles.es/tocadores');
    expect(visit.entryReferrer).toBeNull();
  });

  it('lists the earlier visits of the same browser, newest first', () => {
    const parsed = lines([
      log('2026-09-20T18:00:00', 'GET /tocadores'),
      log('2026-09-20T18:05:00', 'POST /api/order', { referrer: 'https://hsmuebles.es/tocadores' }),
      log('2026-09-28T10:00:00', 'GET /'),
      log('2026-09-28T10:00:01', 'GET /assets/index.js', { referrer: 'https://hsmuebles.es/' }),
      ...ORDER_VISIT,
    ]);
    const visit = describeVisit(parsed, orderLineOf(parsed.slice(4)), CATEGORIES);

    expect(visit.earlierCount).toBe(2);
    expect(visit.earlierVisits).toEqual([
      {
        start: '2026-09-28T10:00:00.000Z',
        end: '2026-09-28T10:00:01.000Z',
        pages: ['Главная'],
        ordered: false,
      },
      {
        start: '2026-09-20T18:00:00.000Z',
        end: '2026-09-20T18:05:00.000Z',
        pages: ['Категория «Tocadores»'],
        ordered: true,
      },
    ]);
    expect(visit.start).toBe('2026-10-01T05:06:46.000Z');
  });
});

describe('pageLabel', () => {
  const catalog = {
    products: new Map([['Tocador-L-05', CATEGORIES[1].products[0]]]),
    bySlug: new Map(CATEGORIES.map((c) => [c.slug, c])),
  };

  it('names the pages of the site in words', () => {
    expect(pageLabel('/', catalog)).toBe('Главная');
    expect(pageLabel('/contacto', catalog)).toBe('Контакты');
    expect(pageLabel('/tocadores', catalog)).toBe('Категория «Tocadores»');
    expect(pageLabel('/tocadores/Tocador-L-05', catalog)).toBe('Товар «Tocador Hollywood»');
    expect(pageLabel('/en/tocadores', catalog)).toBe('Категория «Tocadores» (англ.)');
  });

  it('shows the path of a page it does not know', () => {
    expect(pageLabel('/tocadores/gone-product', catalog)).toBe('/tocadores/gone-product');
  });
});

describe('findOrderVisit', () => {
  let dir;
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));

  const lookupProvider = async () => ({ name: 'Movistar', domain: 'rima-tde.net' });

  function logDir(files) {
    dir = mkdtempSync(join(tmpdir(), 'visit-'));
    files.forEach(({ name, text, mtime }) => {
      const path = join(dir, name);
      writeFileSync(path, name.endsWith('.gz') ? gzipSync(text) : text);
      if (mtime) utimesSync(path, new Date(mtime), new Date(mtime));
    });
    return dir;
  }

  it('finds the visit across rotated and compressed logs', async () => {
    logDir([
      {
        name: 'access.log.2.gz',
        text: `${log('2026-09-28T10:00:00', 'GET /')}\n`,
        mtime: '2026-09-28T23:59:00Z',
      },
      {
        name: 'access.log',
        text: [
          log('2026-10-01T05:06:50', 'GET /', { ip: '88.1.2.3', ua: IPHONE }),
          // Same address, another browser: someone else behind the carrier's IP.
          log('2026-10-01T05:07:00', 'GET /tocadores', { ua: IPHONE }),
          ...ORDER_VISIT,
        ].join('\n'),
      },
      { name: 'error.log', text: 'not an access log' },
    ]);

    const { visit } = await findOrderVisit({
      createdAt: ORDER_SAVED_AT,
      userAgent: WINDOWS_CHROME,
      categories: CATEGORIES,
      dir,
      lookupProvider,
    });

    expect(visit.provider).toEqual({ name: 'Movistar', domain: 'rima-tde.net' });
    expect(visit.events.map((e) => e.type)).toEqual(['page', 'photos', 'order']);
    expect(visit.earlierVisits.map((v) => v.pages)).toEqual([['Главная']]);
  });

  it('says the log is gone for an order older than it', async () => {
    logDir([{ name: 'access.log', text: ORDER_VISIT.join('\n') }]);
    const result = await findOrderVisit({
      createdAt: '2026-09-01T10:00:00Z',
      userAgent: WINDOWS_CHROME,
      categories: CATEGORIES,
      dir,
      lookupProvider,
    });
    expect(result).toEqual({ visit: null, reason: 'expired' });
  });

  it('says so when the order is not in the log', async () => {
    logDir([{ name: 'access.log', text: ORDER_VISIT.join('\n') }]);
    const result = await findOrderVisit({
      createdAt: ORDER_SAVED_AT,
      userAgent: IPHONE,
      categories: CATEGORIES,
      dir,
      lookupProvider,
    });
    expect(result).toEqual({ visit: null, reason: 'not_found' });
  });

  it('says so when there is no log at all', async () => {
    const result = await findOrderVisit({
      createdAt: ORDER_SAVED_AT,
      userAgent: WINDOWS_CHROME,
      categories: CATEGORIES,
      dir: join(tmpdir(), 'definitely-no-such-dir'),
      lookupProvider,
    });
    expect(result).toEqual({ visit: null, reason: 'no_logs' });
  });
});

describe('providerFromHost', () => {
  it('names a provider by its domain and keeps nothing of the IP', () => {
    expect(providerFromHost('204.red-79-153-56.dynamicip.rima-tde.net')).toEqual({
      name: 'Movistar',
      domain: 'rima-tde.net',
    });
    expect(providerFromHost('crawl-66-249-66-1.googlebot.com.')).toEqual({
      name: 'googlebot.com',
      domain: 'googlebot.com',
    });
    expect(providerFromHost(undefined)).toBeNull();
  });
});
