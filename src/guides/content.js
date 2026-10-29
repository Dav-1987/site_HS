// The «Guías» as the site reads them: the snapshot scripts/pull-guides.mjs
// writes from the published articles at build time. The list is small and
// ships with the app — the menu has to know whether there is anything to link
// to — while each article's text is a chunk of its own, loaded on its page only.

import guideIndex from '../data/guides.default.json';

/** The published articles in their order: slug, topic, cover, dates, and per language title, description, coverAlt. */
export const GUIDES = guideIndex;

const articleFiles = import.meta.glob('../data/guide-articles/*.json', { import: 'default' });
const loading = new Map();

export function findGuide(slug) {
  return GUIDES.find((g) => g.slug === slug) ?? null;
}

/**
 * A promise of an article in full — for React's use(), which needs the same
 * promise on every render, hence the cache — or null when there is none.
 */
export function loadGuideArticle(slug) {
  const load = articleFiles[`../data/guide-articles/${slug}.json`];
  if (!load) return null;
  if (!loading.has(slug)) loading.set(slug, load());
  return loading.get(slug);
}

const MONTHS = {
  es: [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ],
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
};

/**
 * "29 de octubre de 2026" / "29 October 2026", or null. Spelled out here
 * rather than by Intl: the page is rendered by Node at build time and then by
 * the browser, and the two need not agree on a locale's wording — a mismatch
 * would break the hydration of the whole page.
 */
export function guideDate(iso, lang) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.getUTCDate();
  const month = MONTHS[lang === 'en' ? 'en' : 'es'][date.getUTCMonth()];
  const year = date.getUTCFullYear();
  return lang === 'en' ? `${day} ${month} ${year}` : `${day} de ${month} de ${year}`;
}
