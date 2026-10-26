/**
 * Tell Bing (and Yandex, Seznam, Naver) through IndexNow which pages a site
 * rebuild changed, so they are recrawled within hours instead of the weeks
 * Bing otherwise takes. ChatGPT's search draws on Bing's index.
 *
 * Run by rebuild-deploy.yml after a successful deploy:
 *   node scripts/indexnow.mjs --previous <live sitemap before deploy> --current dist/sitemap.xml
 * Or once, to hand over every page:
 *   node scripts/indexnow.mjs --all <sitemap.xml>
 *
 * Google does not take IndexNow; it keeps reading the sitemap.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOST = 'hsmuebles.es';
// Not a secret: IndexNow checks it against public/<key>.txt on the site, which
// proves the ping comes from whoever controls the site.
export const INDEXNOW_KEY = '24b4b2973bc36477c6250c7580206467';
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';
// The protocol's limit per request.
const MAX_URLS = 10_000;

/** loc → lastmod ('' when the entry has none) of every <url> in a sitemap. */
export function parseSitemap(xml) {
  const pages = new Map();
  for (const [, entry] of String(xml ?? '').matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = /<loc>\s*([^<\s]+)\s*<\/loc>/.exec(entry)?.[1];
    if (!loc) continue;
    pages.set(loc, /<lastmod>\s*([^<\s]+)\s*<\/lastmod>/.exec(entry)?.[1] ?? '');
  }
  return pages;
}

/**
 * What a rebuild changed: pages that are new, pages whose lastmod moved, and
 * pages that left the sitemap — a removed product too, so search engines see
 * its redirect sooner. Only this site's own addresses.
 */
export function changedUrls(previousXml, currentXml) {
  const before = parseSitemap(previousXml);
  const after = parseSitemap(currentXml);
  const changed = [...after]
    .filter(([loc, lastmod]) => before.get(loc) !== lastmod)
    .map(([loc]) => loc);
  const gone = [...before.keys()].filter((loc) => !after.has(loc));
  return [...changed, ...gone].filter(isOwnUrl);
}

function isOwnUrl(url) {
  try {
    return new URL(url).hostname === HOST;
  } catch {
    return false;
  }
}

/** POSTs the URLs to IndexNow. Resolves to the HTTP status; 200 and 202 mean accepted. */
export async function submitUrls(urls, { fetchImpl = fetch } = {}) {
  const res = await fetchImpl(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: KEY_LOCATION,
      urlList: urls.slice(0, MAX_URLS),
    }),
  });
  return res.status;
}

const readIfThere = (path) => (path && existsSync(path) ? readFileSync(path, 'utf8') : '');

function argValue(args, name) {
  const i = args.indexOf(name);
  return i > -1 ? args[i + 1] : undefined;
}

export async function main(
  args = process.argv.slice(2),
  { fetchImpl = fetch, log = console.log } = {},
) {
  const all = argValue(args, '--all');
  const current = all ?? argValue(args, '--current');
  const currentXml = readIfThere(current);
  if (!currentXml) throw new Error(`No sitemap at ${current}`);

  // No previous sitemap (the live one could not be fetched) means nothing to
  // compare against: hand over every page, which is harmless for 100 or so.
  const previousXml = all ? '' : readIfThere(argValue(args, '--previous'));
  const urls = changedUrls(previousXml, currentXml);
  if (!urls.length) {
    log('IndexNow: the sitemap did not change, nothing to send');
    return 0;
  }

  const status = await submitUrls(urls, { fetchImpl });
  if (status !== 200 && status !== 202) {
    throw new Error(`IndexNow answered ${status} for ${urls.length} URL(s)`);
  }
  log(`IndexNow: sent ${urls.length} URL(s), answered ${status}`);
  urls.forEach((url) => log(`  ${url}`));
  return urls.length;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
