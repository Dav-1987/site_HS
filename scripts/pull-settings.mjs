// Pull the LIVE site settings (edited via /admin, stored in the VPS PostgreSQL
// DB) down into src/data/settings.default.json.
//
// This is not just a convenience: the prerenderer renders every route through
// react-dom/server with no network, so <SettingsProvider> falls back to the
// bundled defaults. Anything the admin sets that ends up in the document head —
// the share title, description and preview image (settings.seo) — reaches
// social scrapers ONLY if it is baked into this file before `npm run build:seo`.
// Without this pull the prerendered HTML keeps the hard-coded i18n fallbacks
// while the running SPA shows the admin's copy, and link previews silently
// disagree with the site.
//
// Usage:
//   npm run settings:pull                       (uses the default production URL)
//   node scripts/pull-settings.mjs <site-url>   (override the URL)

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const DEFAULT_URL = 'https://hsmuebles.es';

// Every group /api/settings is expected to return. The bundled defaults are the
// last-resort fallback for both the client and server merge helpers, so a
// truncated or error-shaped response must never be allowed to overwrite them.
const REQUIRED_GROUPS = ['hero', 'contact', 'seo', 'blocks', 'texts'];

/**
 * Check that a /api/settings payload is a complete settings object before it
 * replaces the bundled defaults. Returns the settings object, or throws with a
 * message naming what was wrong.
 */
export function validateSettingsPayload(data) {
  const settings = data?.settings;
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    throw new Error('response has no `settings` object');
  }
  const missing = REQUIRED_GROUPS.filter(
    (key) => !settings[key] || typeof settings[key] !== 'object',
  );
  if (missing.length) {
    throw new Error(`settings is missing: ${missing.join(', ')}`);
  }
  if (!Array.isArray(settings.featured)) {
    throw new Error('settings.featured is not an array');
  }
  return settings;
}

async function pull(base, target) {
  const res = await fetch(`${base}/api/settings`);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${base}/api/settings — HTTP ${res.status}`);
  }
  const settings = validateSettingsPayload(await res.json());
  await writeFile(target, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
  return settings;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const base = (process.argv[2] || DEFAULT_URL).replace(/\/$/, '');
  const target = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../src/data/settings.default.json',
  );
  try {
    const settings = await pull(base, target);
    const share = settings.seo.description || '(falls back to the built-in copy)';
    console.log(`✓ Pulled site settings from ${base}`);
    console.log(`  share description: ${share}`);
    console.log(`  → ${target}`);
  } catch (error) {
    console.error(`✗ ${error.message}`);
    process.exit(1);
  }
}
