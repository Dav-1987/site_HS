#!/usr/bin/env node
// Прогоняет URL Inspection API по всем адресам из sitemap и складывает
// сырые ответы в JSON — чтобы понять, что именно Google думает о каждой странице.
import { createSign } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const KEY_PATH = 'secrets/winter-bridge-500219-n1-9517caecb488.json';
const SITE = 'sc-domain:hsmuebles.es';
const OUT = process.argv[2] || 'gsc-inspection.json';
const CONCURRENCY = 4;

function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getToken() {
  const key = JSON.parse(readFileSync(KEY_PATH, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }));
  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${claim}`);
  const jwt = `${header}.${claim}.${b64url(sign.sign(key.private_key))}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`token failed: ${JSON.stringify(json)}`);
  return json.access_token;
}

async function fetchSitemapUrls() {
  const res = await fetch('https://hsmuebles.es/sitemap.xml');
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

async function inspect(token, url, attempt = 0) {
  const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE }),
  });
  if (res.status === 429 && attempt < 4) {
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    return inspect(token, url, attempt + 1);
  }
  const json = await res.json();
  if (json.error) return { url, error: json.error.message };
  const r = json.inspectionResult?.indexStatusResult ?? {};
  return {
    url,
    verdict: r.verdict,
    coverageState: r.coverageState,
    robotsTxtState: r.robotsTxtState,
    indexingState: r.indexingState,
    pageFetchState: r.pageFetchState,
    userCanonical: r.userCanonical,
    googleCanonical: r.googleCanonical,
    lastCrawlTime: r.lastCrawlTime,
    crawledAs: r.crawledAs,
    referringUrls: r.referringUrls,
  };
}

const token = await getToken();
const urls = await fetchSitemapUrls();
console.error(`inspecting ${urls.length} urls…`);

const results = [];
let cursor = 0;
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (cursor < urls.length) {
    const i = cursor++;
    results[i] = await inspect(token, urls[i]);
    if (results.filter(Boolean).length % 25 === 0) console.error(`  ${results.filter(Boolean).length}/${urls.length}`);
  }
}));

writeFileSync(OUT, JSON.stringify(results, null, 2));
console.error(`wrote ${OUT}`);
