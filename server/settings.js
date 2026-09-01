// Site-settings data access — port of netlify/functions/_shared/settings.mts
// Replaced @netlify/blobs → PostgreSQL site_settings table

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pool from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultSettings = JSON.parse(
  readFileSync(join(__dirname, '../src/data/settings.default.json'), 'utf8'),
);

const MAX_TEXT_LEN = 4000;
const MAX_FEATURED = 12;
const MAX_REVIEWS = 200;

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

function sanitizeFeaturedCards(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  for (const card of input) {
    if (!card || typeof card !== 'object') continue;
    const productId = typeof card.productId === 'string' ? card.productId.trim() : '';
    if (!productId) continue;
    const cover = typeof card.cover === 'string' ? card.cover.trim().slice(0, MAX_TEXT_LEN) : '';
    const video = typeof card.video === 'string' ? card.video.trim().slice(0, MAX_TEXT_LEN) : '';
    out.push({ productId: productId.slice(0, MAX_TEXT_LEN), cover, video });
    if (out.length >= MAX_FEATURED) break;
  }
  return out;
}

function sanitizeTexts(texts) {
  const out = { es: {}, en: {} };
  for (const lang of ['es', 'en']) {
    const map = texts?.[lang];
    if (map && typeof map === 'object') {
      for (const [key, value] of Object.entries(map)) {
        if (typeof value === 'string' && value.trim()) {
          out[lang][key] = value.slice(0, MAX_TEXT_LEN);
        }
      }
    }
  }
  return out;
}

function sanitizeContact(c) {
  const def = defaultSettings.contact || {};
  const str = (v, fb = '') => (typeof v === 'string' ? v.trim().slice(0, MAX_TEXT_LEN) : fb);
  return {
    instagram: str(c?.instagram, def.instagram),
    tiktok: str(c?.tiktok, def.tiktok),
    whatsapp: str(c?.whatsapp, def.whatsapp),
    phone: str(c?.phone, def.phone),
    email: str(c?.email, def.email),
  };
}

function sanitizeSeo(seo) {
  const def = defaultSettings.seo || {};
  const str = (v, fb = '') => (typeof v === 'string' ? v.trim().slice(0, MAX_TEXT_LEN) : fb);
  return {
    image: str(seo?.image, def.image),
    title: str(seo?.title, def.title),
    description: str(seo?.description, def.description),
  };
}

// On/off switches for whole sections of the site. Mirrors BLOCKS in
// src/data/settings.js — anything that isn't an explicit `false` stays on, so a
// settings row written before a switch existed never blanks its section.
const BLOCKS = ['featured', 'collections', 'heroPromo', 'reviews', 'reviewsHome'];

function sanitizeBlocks(blocks) {
  const out = {};
  for (const key of BLOCKS) out[key] = blocks?.[key] !== false;
  return out;
}

// The reviews wall: ordered `{ image }` / `{ video }` items and nothing else.
// Mirrors sanitizeReviews in src/data/settings.js — the two must agree, or a
// field the client sends is silently dropped on save.
function sanitizeReviews(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  const seen = new Set();
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const image = typeof item.image === 'string' ? item.image.trim().slice(0, MAX_TEXT_LEN) : '';
    const video = typeof item.video === 'string' ? item.video.trim().slice(0, MAX_TEXT_LEN) : '';
    if (!image && !video) continue;
    const key = video || image;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(video ? { video } : { image });
    if (out.length >= MAX_REVIEWS) break;
  }
  return out;
}

export function mergeSettings(input) {
  const image = input?.hero?.image;
  const imageMobile = input?.hero?.imageMobile;
  const video = input?.hero?.video;
  return {
    hero: {
      image:
        typeof image === 'string' && image.trim()
          ? image.trim()
          : defaultSettings.hero.image,
      imageMobile: typeof imageMobile === 'string' ? imageMobile.trim() : '',
      video: typeof video === 'string' ? video.trim() : '',
    },
    featured: sanitizeFeatured(input?.featured),
    featuredCards: sanitizeFeaturedCards(input?.featuredCards),
    reviews: sanitizeReviews(input?.reviews),
    texts: sanitizeTexts(input?.texts),
    contact: sanitizeContact(input?.contact),
    seo: sanitizeSeo(input?.seo),
    blocks: sanitizeBlocks(input?.blocks),
  };
}

export async function readSettings() {
  const { rows } = await pool.query(
    "SELECT value FROM site_settings WHERE key = 'settings'",
  );
  return mergeSettings(rows[0]?.value ?? null);
}

export async function writeSettings(input) {
  const next = mergeSettings(input);
  await pool.query(
    `INSERT INTO site_settings (key, value) VALUES ('settings', $1::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [JSON.stringify(next)],
  );
  return next;
}
