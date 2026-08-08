import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const TAG_RE = /<(?:meta|link)\b[^>]*>/gi;

function attributes(tag) {
  const result = {};
  const attrRe = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  for (const match of tag.matchAll(attrRe)) {
    result[match[1].toLowerCase()] = match[2] ?? match[3] ?? '';
  }
  return result;
}

function tagsInHead(html) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '';
  return (head.match(TAG_RE) ?? []).map(attributes);
}

function languageFor(url) {
  const pathname = new URL(url).pathname;
  return pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'es';
}

function pagePath(distDir, url) {
  const pathname = new URL(url).pathname;
  return pathname === '/'
    ? join(distDir, 'index.html')
    : join(distDir, pathname.replace(/^\/+/, ''), 'index.html');
}

export function validateSeoPage(html, expected) {
  const errors = [];
  const tags = tagsInHead(html);
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '';
  const title = head.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  const description = tags.find((tag) => tag.name?.toLowerCase() === 'description')?.content?.trim();
  const canonicals = tags.filter((tag) => tag.rel?.toLowerCase() === 'canonical');
  const robots = tags.find((tag) => tag.name?.toLowerCase() === 'robots')?.content ?? '';
  const alternates = tags.filter((tag) => tag.rel?.toLowerCase() === 'alternate' && tag.hreflang);
  const htmlLang = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1]?.toLowerCase();
  const expectedLang = languageFor(expected.loc);

  if (!title) errors.push('missing <title>');
  if (!description) errors.push('missing meta description');
  if (!/<main\b[^>]*>[\s\S]*?<h1\b/i.test(html)) errors.push('missing rendered <h1> inside <main>');
  if (canonicals.length !== 1) {
    errors.push(`expected one canonical, found ${canonicals.length}`);
  } else if (canonicals[0].href !== expected.loc) {
    errors.push(`canonical is ${canonicals[0].href}, expected ${expected.loc}`);
  }
  if (/\bnoindex\b/i.test(robots)) errors.push('sitemap page contains noindex');
  if (htmlLang !== expectedLang) errors.push(`html lang is ${htmlLang || 'missing'}, expected ${expectedLang}`);

  for (const alternate of expected.alternates) {
    const actual = alternates.find((tag) => tag.hreflang?.toLowerCase() === alternate.hreflang);
    if (!actual) errors.push(`missing hreflang ${alternate.hreflang}`);
    else if (actual.href !== alternate.href) {
      errors.push(`hreflang ${alternate.hreflang} is ${actual.href}, expected ${alternate.href}`);
    }
  }

  return { errors, title };
}

export function assertSeoBuild(distDir, urls) {
  const failures = [];
  const titlesByLanguage = new Map();

  for (const expected of urls) {
    const file = pagePath(distDir, expected.loc);
    if (!existsSync(file)) {
      failures.push(`${expected.loc}: prerender file is missing`);
      continue;
    }

    const html = readFileSync(file, 'utf8');
    const { errors, title } = validateSeoPage(html, expected);
    for (const error of errors) failures.push(`${expected.loc}: ${error}`);

    if (title) {
      const language = languageFor(expected.loc);
      const key = `${language}:${title}`;
      const previous = titlesByLanguage.get(key);
      if (previous) failures.push(`${expected.loc}: duplicate ${language} title also used by ${previous}`);
      else titlesByLanguage.set(key, expected.loc);
    }
  }

  if (failures.length) {
    const preview = failures.slice(0, 30).map((failure) => `  - ${failure}`).join('\n');
    const remainder = failures.length > 30 ? `\n  ...and ${failures.length - 30} more` : '';
    throw new Error(`SEO build validation failed (${failures.length} issues):\n${preview}${remainder}`);
  }

  return { checked: urls.length };
}
