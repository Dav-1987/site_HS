// Site-wide settings (hero image, text overrides, …) editable from /admin and
// persisted in Netlify Blobs. This module holds the bundled default — the single
// source of truth shared with the Netlify function — used for the instant first
// paint and as an offline/empty fallback. The pure merge helper fills/sanitises.

import defaultSettingsData from './settings.default.json';

/** The bundled default settings (instant first paint + fallback). */
export const defaultSettings = defaultSettingsData;

/** Max curated picks kept for the homepage "Featured" section. */
const MAX_FEATURED = 12;

/** Keep an ordered, de-duped list of product-id strings (capped). */
function sanitizeFeatured(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const out = [];
  for (const id of input) {
    if (typeof id !== 'string') continue;
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= MAX_FEATURED) break;
  }
  return out;
}

/** Keep only non-empty string overrides, grouped by language. */
function sanitizeTexts(texts) {
  const out = { es: {}, en: {} };
  for (const lang of ['es', 'en']) {
    const map = texts?.[lang];
    if (map && typeof map === 'object') {
      for (const [key, value] of Object.entries(map)) {
        if (typeof value === 'string' && value.trim()) out[lang][key] = value;
      }
    }
  }
  return out;
}

/**
 * Fill any missing fields from the defaults so callers always get a complete,
 * usable settings object. An empty `hero.image` falls back to the default image;
 * `featured` is an ordered list of product ids (empty → auto-curated on the home
 * page); `texts` is a sparse map of UI-copy overrides (empty → use the code default).
 */
export function mergeSettings(input) {
  const image = input?.hero?.image;
  const imageMobile = input?.hero?.imageMobile;
  const video = input?.hero?.video;
  return {
    hero: {
      image:
        typeof image === 'string' && image.trim() ? image.trim() : defaultSettings.hero.image,
      imageMobile: typeof imageMobile === 'string' ? imageMobile.trim() : '',
      video: typeof video === 'string' ? video.trim() : '',
    },
    featured: sanitizeFeatured(input?.featured),
    texts: sanitizeTexts(input?.texts),
  };
}
