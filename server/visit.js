// «Подробности визита» in /admin: what the customer did on the site before an
// order, read from nginx's access log when the owner asks. Nothing is stored —
// the log is the only record, so an order older than the log (logrotate keeps
// 14 days) has no details left.
//
// The order's own POST /api/order line is found by its time and the browser's
// User-Agent, which the order saved; that line's IP then picks out the rest of
// the visit. IP and User-Agent together, because a mobile carrier puts many
// customers behind one address.

import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { gunzip as gunzipCallback } from 'node:zlib';
import { Resolver } from 'node:dns/promises';

import { productImages, productLabel } from '../src/data/catalog.js';
import { cleanUserAgent } from './device.js';

const gunzip = promisify(gunzipCallback);

export const LOG_DIR = '/var/log/nginx';

// nginx writes the line when the response is sent, a moment after the order
// row was saved; the line's time has whole seconds only.
const ORDER_LINE_EARLY_MS = 2_000;
const ORDER_LINE_LATE_MS = 60_000;

// A pause this long ends one visit and starts the next.
const SESSION_GAP_MS = 30 * 60_000;

// Photos a page fetches by itself as it opens (the cover, srcset picks) are not
// the customer looking at them.
const AUTO_LOAD_MS = 5_000;

const EARLIER_VISITS_LISTED = 5;

const SITE_HOSTS = new Set(['hsmuebles.es', 'www.hsmuebles.es']);

// nginx's default "combined" format.
const LINE = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+)[^"]*" (\d{3}) \S+ "([^"]*)" "([^"]*)"/;
const TIME = /^(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-])(\d{2})(\d{2})$/;
const MONTHS = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

// A resized upload, as resolveImage() in src/data/catalog.js names it.
const PHOTO = /^\/uploads\/([0-9a-f]{32})_(\d+)\.\w+$/;
// The original upload a product's image field holds.
const UPLOAD_KEY = /^\/uploads\/([0-9a-f]{32})\./;
const NOT_PAGES = /^\/(api|assets|uploads|feed|admin)(\/|$)/;

const STATIC_PAGES = {
  catalogo: 'Каталог',
  contacto: 'Контакты',
  envios: 'Доставка',
  devoluciones: 'Возврат',
  opiniones: 'Отзывы',
  'privacy-policy': 'Политика конфиденциальности',
  'legal-notice': 'Правовая информация',
};

// Reverse-DNS domains worth naming. Anything else is shown as the bare domain.
const PROVIDERS = {
  'rima-tde.net': 'Movistar',
  // Vodafone Spain still answers under the name of Airtel, which it bought.
  'airtel.net': 'Vodafone',
  'ono.com': 'Vodafone (ONO)',
  'vodafone.es': 'Vodafone',
  'orange.es': 'Orange',
  'google.com': 'Google',
  'googleusercontent.com': 'Google Cloud',
  'amazonaws.com': 'Amazon AWS',
};

function parseLogTime(text) {
  const m = TIME.exec(text);
  if (!m || !(m[2] in MONTHS)) return NaN;
  const utc = Date.UTC(+m[3], MONTHS[m[2]], +m[1], +m[4], +m[5], +m[6]);
  const offset = (m[7] === '-' ? -1 : 1) * (+m[8] * 60 + +m[9]) * 60_000;
  return utc - offset;
}

/** One access-log line, or null for anything that is not one. */
export function parseLogLine(text) {
  const m = LINE.exec(text);
  if (!m) return null;
  const at = parseLogTime(m[2]);
  if (Number.isNaN(at)) return null;
  return {
    ip: m[1],
    at,
    method: m[3],
    path: m[4].split('?')[0],
    status: Number(m[5]),
    referrer: m[6],
    userAgent: m[7],
  };
}

const isOrderPost = (line) =>
  line.method === 'POST' && line.path === '/api/order' && line.status === 200;

function normalizePath(path) {
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

function isPagePath(path) {
  return path.startsWith('/') && !NOT_PAGES.test(path) && !/\.[a-z0-9]+$/i.test(path);
}

// The page a request was made from: a page fetched is that page; anything else
// names it in its Referer, which follows the SPA's own navigation too.
function pageOf(line) {
  if (line.method === 'GET' && isPagePath(line.path)) return normalizePath(line.path);
  try {
    const url = new URL(line.referrer);
    return SITE_HOSTS.has(url.hostname) && isPagePath(url.pathname)
      ? normalizePath(url.pathname)
      : null;
  } catch {
    return null;
  }
}

function indexCatalog(categories) {
  const products = new Map();
  const bySlug = new Map();
  const byPhoto = new Map();
  for (const category of categories ?? []) {
    bySlug.set(category.slug, category);
    for (const product of category.products ?? []) {
      products.set(product.id, product);
      for (const src of [...productImages(product), product.imageMobile]) {
        const key = UPLOAD_KEY.exec(src ?? '')?.[1];
        if (key) byPhoto.set(key, product);
      }
    }
  }
  return { products, bySlug, byPhoto };
}

function pageParts(path) {
  const parts = path
    .split('/')
    .filter(Boolean)
    .map((p) => {
      try {
        return decodeURIComponent(p);
      } catch {
        return p;
      }
    });
  const english = parts[0] === 'en';
  return { english, parts: english ? parts.slice(1) : parts };
}

function productOfPage(path, catalog) {
  const { parts } = pageParts(path);
  return parts.length === 2 ? (catalog.products.get(parts[1]) ?? null) : null;
}

/** How /admin names a page of the site: «Главная», «Товар «…»», or the path. */
export function pageLabel(path, catalog) {
  const { english, parts } = pageParts(path);
  const product = productOfPage(path, catalog);
  const category = parts.length === 1 ? catalog.bySlug.get(parts[0]) : null;
  let label = path;
  if (!parts.length) label = 'Главная';
  else if (parts.length === 1 && STATIC_PAGES[parts[0]]) label = STATIC_PAGES[parts[0]];
  else if (category) {
    const name = typeof category.name === 'string' ? category.name : category.name?.es;
    label = `Категория «${name || category.slug}»`;
  } else if (product) label = `Товар «${productLabel(product, 'es')}»`;
  return english ? `${label} (англ.)` : label;
}

// The pages of a visit in the order they were open, each with the photos of
// its own product that were opened large while it was.
function walkPages(lines, catalog) {
  const events = [];
  let page = null;
  for (const line of lines) {
    const here = pageOf(line);
    if (here && here !== page?.path) {
      page = { type: 'page', at: line.at, path: here, photos: new Set(), photosAt: null };
      events.push(page);
    }
    const photo = PHOTO.exec(line.path);
    if (photo && page && Number(photo[2]) >= 800 && line.at - page.at > AUTO_LOAD_MS) {
      const owner = catalog.byPhoto.get(photo[1]);
      if (owner && owner === productOfPage(page.path, catalog)) {
        page.photos.add(photo[1]);
        page.photosAt ??= line.at;
      }
    }
    if (isOrderPost(line)) events.push({ type: 'order', at: line.at });
  }
  return events;
}

const iso = (ms) => new Date(ms).toISOString();

function eventsOut(events, catalog) {
  return events.flatMap((e) => {
    if (e.type === 'order') return [{ type: 'order', at: iso(e.at) }];
    const out = [{ type: 'page', at: iso(e.at), path: e.path, label: pageLabel(e.path, catalog) }];
    if (e.photos.size) {
      const product = productOfPage(e.path, catalog);
      out.push({
        type: 'photos',
        at: iso(e.photosAt),
        count: e.photos.size,
        total: productImages(product).length,
      });
    }
    return out;
  });
}

function splitSessions(lines) {
  const sessions = [];
  for (const line of lines) {
    const last = sessions.at(-1);
    if (last && line.at - last.at(-1).at <= SESSION_GAP_MS) last.push(line);
    else sessions.push([line]);
  }
  return sessions;
}

/**
 * The visit that ended in `orderLine`, from every request of that IP and
 * browser (`lines`, oldest first), plus the visits before it.
 */
export function describeVisit(lines, orderLine, categories) {
  const catalog = indexCatalog(categories);
  const sessions = splitSessions(lines);
  const index = sessions.findIndex((s) => s.some((l) => isOrderPost(l) && l.at === orderLine.at));
  if (index < 0) return null;
  const session = sessions[index];
  const end = session.findIndex((l) => isOrderPost(l) && l.at === orderLine.at);
  const visit = session.slice(0, end + 1);

  const earlier = sessions
    .slice(0, index)
    .reverse()
    .map((s) => {
      const events = walkPages(s, catalog);
      const pages = [...new Set(events.filter((e) => e.type === 'page').map((e) => e.path))];
      return {
        start: iso(s[0].at),
        end: iso(s.at(-1).at),
        pages: pages.map((p) => pageLabel(p, catalog)),
        ordered: events.some((e) => e.type === 'order'),
      };
    })
    .filter((v) => v.pages.length || v.ordered);

  return {
    start: iso(visit[0].at),
    orderAt: iso(orderLine.at),
    events: eventsOut(walkPages(visit, catalog), catalog),
    earlierVisits: earlier.slice(0, EARLIER_VISITS_LISTED),
    earlierCount: earlier.length,
  };
}

/**
 * Of the order POSTs logged around the time the order was saved, the one this
 * order came from. An order saved before User-Agents were stored is matched on
 * time alone, and only when that leaves no doubt.
 */
export function pickOrderLine(candidates, userAgent, orderTime) {
  const ua = cleanUserAgent(userAgent);
  const matching = ua ? candidates.filter((l) => cleanUserAgent(l.userAgent) === ua) : candidates;
  if (!matching.length) return null;
  if (!ua && new Set(matching.map((l) => l.ip)).size > 1) return null;
  return matching.reduce((best, l) =>
    Math.abs(l.at - orderTime) < Math.abs(best.at - orderTime) ? l : best,
  );
}

async function logFiles(dir) {
  let names;
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  const files = await Promise.all(
    names
      .filter((name) => /^access\.log(\.\d+(\.gz)?)?$/.test(name))
      .map(async (name) => {
        const path = join(dir, name);
        try {
          return { path, gz: name.endsWith('.gz'), mtime: (await stat(path)).mtimeMs };
        } catch {
          return null; // rotated away while we looked
        }
      }),
  );
  return files.filter(Boolean).sort((a, b) => a.mtime - b.mtime);
}

async function readLog(file) {
  try {
    const raw = await readFile(file.path);
    return (file.gz ? await gunzip(raw) : raw).toString('utf8').split('\n');
  } catch (err) {
    console.error(`visit: cannot read ${file.path}:`, err.message);
    return [];
  }
}

async function oldestLogTime(files) {
  for (const file of files) {
    for (const text of await readLog(file)) {
      const line = parseLogLine(text);
      if (line) return line.at;
    }
  }
  return Infinity;
}

/**
 * The provider a reverse-DNS host name belongs to. Only the domain is kept:
 * the rest of the name spells out the customer's IP.
 */
export function providerFromHost(host) {
  if (!host) return null;
  const domain = host.toLowerCase().replace(/\.$/, '').split('.').slice(-2).join('.');
  return { name: PROVIDERS[domain] ?? domain, domain };
}

/** The customer's internet provider, from the IP's reverse DNS, or null. */
export async function providerOf(ip) {
  try {
    const resolver = new Resolver({ timeout: 1500, tries: 1 });
    const [host] = await resolver.reverse(ip);
    return providerFromHost(host);
  } catch {
    return null;
  }
}

/**
 * What the customer did on the site before this order. Resolves to
 * `{ visit }`, or `{ visit: null, reason }` with reason 'no_logs' (no access
 * log here), 'expired' (the log of that day is gone) or 'not_found'.
 */
export async function findOrderVisit({
  createdAt,
  userAgent,
  categories,
  dir = LOG_DIR,
  lookupProvider = providerOf,
}) {
  const files = await logFiles(dir);
  if (!files.length) return { visit: null, reason: 'no_logs' };
  const orderTime = new Date(createdAt).getTime();

  const candidates = [];
  for (const file of files) {
    // A file last written before the order holds nothing from after it.
    if (file.mtime < orderTime) continue;
    for (const text of await readLog(file)) {
      if (!text.includes('"POST /api/order ')) continue;
      const line = parseLogLine(text);
      if (
        line &&
        isOrderPost(line) &&
        line.at >= orderTime - ORDER_LINE_EARLY_MS &&
        line.at <= orderTime + ORDER_LINE_LATE_MS
      ) {
        candidates.push(line);
      }
    }
  }
  const orderLine = pickOrderLine(candidates, userAgent, orderTime);
  if (!orderLine) {
    const expired = (await oldestLogTime(files)) > orderTime;
    return { visit: null, reason: expired ? 'expired' : 'not_found' };
  }

  const prefix = `${orderLine.ip} `;
  const lines = [];
  for (const file of files) {
    for (const text of await readLog(file)) {
      if (!text.startsWith(prefix)) continue;
      const line = parseLogLine(text);
      if (line && line.userAgent === orderLine.userAgent) lines.push(line);
    }
  }
  lines.sort((a, b) => a.at - b.at);

  const visit = describeVisit(lines, orderLine, categories);
  if (!visit) return { visit: null, reason: 'not_found' };
  return { visit: { ...visit, provider: await lookupProvider(orderLine.ip) } };
}
