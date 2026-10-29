// llms.txt with the guides in it. public/llms.txt is the hand-written part —
// what the shop is and where its pages are — and Vite copies it into dist/
// as it is; this appends the published «Guías» articles, read off the same
// snapshot the pages are built from, so the list never names an article the
// site does not have, nor misses one it has.
//
// Run after `vite build`, like the sitemap:
//   node scripts/generate-llms.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GUIDES_SLUG } from '../src/data/guides.js';
import { withLang } from '../src/i18n/routing.js';

const SITE = 'https://hsmuebles.es';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const HEADINGS = {
  es: { title: 'Guías', section: 'Todas las guías' },
  en: { title: 'Guides', section: 'All guides' },
};

function list(guides, lang) {
  const url = (path) => `${SITE}${withLang(path, lang)}`;
  return [
    `## ${HEADINGS[lang].title}`,
    '',
    `- [${HEADINGS[lang].section}](${url(`/${GUIDES_SLUG}`)})`,
    ...guides.map((g) => {
      const { title, description } = g[lang];
      return `- [${title}](${url(`/${GUIDES_SLUG}/${g.slug}`)}): ${description}`;
    }),
  ].join('\n');
}

/** `base` (the hand-written llms.txt) with a section per language listing `guides`. */
export function withGuides(base, guides) {
  if (!guides?.length) return base;
  return `${base.trimEnd()}\n\n${list(guides, 'es')}\n\n${list(guides, 'en')}\n`;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const target = join(ROOT, 'dist/llms.txt');
  const guides = JSON.parse(readFileSync(join(ROOT, 'src/data/guides.default.json'), 'utf8'));
  writeFileSync(target, withGuides(readFileSync(target, 'utf8'), guides), 'utf8');
  console.log(`✅ llms.txt — ${guides.length} guide(s) listed`);
}
