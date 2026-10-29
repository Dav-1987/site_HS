import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { createHash } from 'node:crypto';
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import pool from './db.js';
import {
  verifyPassword,
  changePassword,
  createSessionToken,
  sessionCookie,
  clearCookie,
  isAuthenticated,
} from './auth.js';
import {
  readOrSeedCatalog,
  writeCatalog,
  recordVersion,
  listVersions,
  getVersionData,
  extractUploadKeys,
  scheduleForDeletion,
  unscheduleFiles,
  getFilesReadyToDelete,
  purgePendingRecords,
} from './store.js';
import { readSettings, writeSettings } from './settings.js';
import {
  listGuides,
  getGuide,
  createGuide,
  updateGuide,
  deleteGuide,
  reorderGuides,
  extractGuideKeys,
  loadGuideSeeds,
  seedGuides,
} from './guides.js';
import { guideUploadKeys, sanitizeGuide } from '../src/data/guides.js';
import { createQueue, isStale, revisionOf } from './revision.js';
import { listOrders, deleteOrder, getOrderOrigin, parseOrderPatch, updateOrder } from './orders.js';
import { findOrderVisit } from './visit.js';
import { handleOrder } from './order-handler.js';
import { buildGoogleFeed, buildMetaFeed, buildPinterestFeed } from './feed.js';
import { buildRedirectIndex, resolveRedirect, withQuery } from './redirects.js';
import { rebuildConfigured, triggerRebuild, getLatestRun } from './rebuild.js';
import { extractPoster, isVideoFile, posterFor, sweepVideos } from './video.js';
import { findStrayUploads } from './uploads-cleanup.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, '../uploads');

if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

const app = express();
app.set('trust proxy', 1); // nginx sits in front — trust X-Forwarded-For for rate limiting
const PORT = process.env.PORT || 4000;

// ─── Статика ─────────────────────────────────────────────────────────────────

const DIST_DIR = join(__dirname, '../dist');

// Загруженные картинки
app.use(
  '/uploads',
  express.static(UPLOADS_DIR, {
    maxAge: '1y',
    immutable: true,
  }),
);

// Фронтенд (React SPA)
app.use(express.static(DIST_DIR));

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }));

// ─── /api/admin/login + /api/admin-login (оба варианта) ──────────────────────

function handleLoginGet(req, res) {
  res.json({ authed: isAuthenticated(req) });
}
function handleLoginDelete(req, res) {
  res.setHeader('Set-Cookie', clearCookie());
  res.json({ ok: true });
}
async function handleLoginPost(req, res) {
  if (!(await verifyPassword(req.body?.password))) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  const token = createSessionToken();
  res.setHeader('Set-Cookie', sessionCookie(token));
  res.json({ ok: true });
}

async function handleChangePassword(req, res) {
  try {
    await changePassword(req.body?.currentPassword, req.body?.newPassword);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  const token = createSessionToken();
  res.setHeader('Set-Cookie', sessionCookie(token));
  res.json({ ok: true });
}

const loginRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, try again in a minute' },
});

app.get(['/api/admin/login', '/api/admin-login'], handleLoginGet);
app.delete(['/api/admin/login', '/api/admin-login'], handleLoginDelete);
app.post(['/api/admin/login', '/api/admin-login'], loginRateLimit, handleLoginPost);
app.post('/api/admin/change-password', loginRateLimit, handleChangePassword);

// ─── Orphaned-upload cleanup ──────────────────────────────────────────────────

function extractSettingsKeys(settings) {
  const keys = new Set();
  const add = (url) => {
    if (typeof url === 'string' && url.startsWith('/uploads/')) keys.add(url.slice(9));
  };
  add(settings?.hero?.image);
  add(settings?.hero?.imageMobile);
  add(settings?.hero?.video);
  for (const card of settings?.featuredCards ?? []) {
    add(card?.cover);
    add(card?.video);
  }
  // Reviews live only in settings — miss them here and the cleanup would count
  // every screenshot as an orphan.
  for (const review of settings?.reviews ?? []) {
    add(review?.image);
    add(review?.video);
  }
  return keys;
}

// Every upload something on the site uses. Throws when any part cannot be read:
// a sweep that went ahead without the articles would take their photos.
async function collectAllActiveKeys() {
  const [catalog, settings, guides] = await Promise.all([
    readOrSeedCatalog(),
    readSettings(),
    listGuides({ includeDrafts: true }),
  ]);
  const keys = extractUploadKeys(catalog);
  for (const k of extractSettingsKeys(settings)) keys.add(k);
  for (const k of extractGuideKeys(guides)) keys.add(k);
  return keys;
}

// The articles' uploads, for a catalog or settings save deciding which of its
// own files nothing uses any more. A failed read leaves them out instead of
// failing the save: a file queued by mistake is still safe, because the sweep
// reads the articles again before deleting and stops when it cannot.
async function guideKeysForSave() {
  try {
    return extractGuideKeys(await listGuides({ includeDrafts: true }));
  } catch (err) {
    console.error(`[guides] uploads unknown for this save: ${err.message}`);
    return new Set();
  }
}

// After an article was created, changed or deleted: a file it no longer uses
// that nothing else uses either goes in the deletion queue, one it uses again
// leaves it. Never throws — the article is saved by then, and a hiccup here
// only means the hourly pass sorts the file out instead.
async function settleGuideUploads(before, after) {
  try {
    const active = await collectAllActiveKeys();
    const removed = new Set([...before].filter((k) => !active.has(k)));
    const reAdded = new Set([...after].filter((k) => !before.has(k)));
    if (removed.size) await scheduleForDeletion(removed);
    if (reAdded.size) await unscheduleFiles(reAdded);
  } catch (err) {
    console.error('[guides] upload bookkeeping failed', err);
  }
}

// Uploads that never reached a catalog or settings save: see uploads-cleanup.js
// for why the queue alone never catches them.
async function scheduleStrayUploads(active) {
  const entries = readdirSync(UPLOADS_DIR).flatMap((name) => {
    try {
      return [{ name, mtimeMs: statSync(join(UPLOADS_DIR, name)).mtimeMs }];
    } catch {
      return []; // vanished between listing and stat — nothing to schedule
    }
  });
  const stray = findStrayUploads(entries, active);
  if (!stray.length) return;
  await scheduleForDeletion(stray);
  console.log(`[cleanup] scheduled ${stray.length} unreferenced upload(s) for deletion`);
}

async function runCleanup() {
  try {
    const active = await collectAllActiveKeys();
    // A catalog that reads as empty means something went wrong upstream — a
    // half-answered query, a seed that didn't land — never that the site
    // genuinely uses no images. Sweeping on that reading would take every
    // upload with it, so the pass simply doesn't run.
    if (!active.size) {
      console.error('[cleanup] skipped: no active uploads reported, refusing to sweep');
      return;
    }

    // Files nothing ever referenced are invisible to the save-driven queue —
    // put them in it, which still leaves them a day before deletion.
    await scheduleStrayUploads(active);

    const due = await getFilesReadyToDelete();
    if (!due.length) return;
    const toDelete = due.filter((f) => !active.has(f));
    const done = [];
    for (const filename of toDelete) {
      try {
        unlinkSync(join(UPLOADS_DIR, filename));
        const base = filename.replace(/\.[^.]+$/, '');
        for (const w of WEBP_SIZES) {
          try {
            unlinkSync(join(UPLOADS_DIR, `${base}_${w}.webp`));
          } catch {}
        }
        // Постер видеоотзыва и его версии: он выводится из имени видео, а не
        // хранится в настройках, поэтому сам под чистку никогда не попадёт —
        // убираем его здесь, иначе он останется висеть навсегда.
        try {
          unlinkSync(join(UPLOADS_DIR, `${base}_poster.jpg`));
        } catch {}
        for (const w of WEBP_SIZES) {
          try {
            unlinkSync(join(UPLOADS_DIR, `${base}_poster_${w}.webp`));
          } catch {}
        }
        console.log(`[cleanup] deleted: ${filename}`);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(`[cleanup] failed to delete ${filename}:`, err);
          continue;
        }
      }
      done.push(filename);
    }
    // Also purge records for files that turned out to be active again
    const reactivated = due.filter((f) => active.has(f));
    await purgePendingRecords([...done, ...reactivated]);
  } catch (err) {
    console.error('[cleanup] error:', err);
  }
}

// ─── /api/catalog ─────────────────────────────────────────────────────────────

// Three-state visibility (see src/data/catalog.js). Absent is fine — it means
// 'public' — but a value outside the set is rejected rather than silently
// normalized, since it would otherwise publish a section someone meant to hide.
const VISIBILITY = ['public', 'unlisted', 'off'];
const badVisibility = (v) => v !== undefined && !VISIBILITY.includes(v);

function validateCatalog(categories) {
  if (!Array.isArray(categories)) return 'categories must be an array';
  const slugs = new Set();
  const ids = new Set();
  for (const c of categories) {
    if (!c?.slug || typeof c.slug !== 'string') return 'every category needs a slug';
    if (slugs.has(c.slug)) return `duplicate category slug: ${c.slug}`;
    slugs.add(c.slug);
    if (!c.name?.es || !c.name?.en) return `category "${c.slug}" needs name.es and name.en`;
    if (badVisibility(c.visibility))
      return `category "${c.slug}" has an unknown visibility: ${c.visibility}`;
    if (!Array.isArray(c.products)) return `category "${c.slug}" needs a products array`;
    for (const p of c.products) {
      if (!p?.id || typeof p.id !== 'string') return `every product in "${c.slug}" needs an id`;
      if (ids.has(p.id)) return `duplicate product id: ${p.id}`;
      ids.add(p.id);
      if (!p.name) return `product "${p.id}" needs a name`;
      if (badVisibility(p.visibility))
        return `product "${p.id}" has an unknown visibility: ${p.visibility}`;
      if (p.related !== undefined) {
        if (!Array.isArray(p.related)) return `product "${p.id}" related must be an array`;
        if (p.related.length > 50) return `product "${p.id}" has too many related items`;
        if (p.related.some((rid) => typeof rid !== 'string'))
          return `product "${p.id}" related must be a list of product ids`;
      }
    }
  }
  return null;
}

// Catalog and settings writes run one at a time, so a save's revision check and
// its write are never split by another save (see revision.js).
const writes = createQueue();

app.get('/api/catalog', async (req, res) => {
  try {
    const categories = await readOrSeedCatalog();
    res.json({ categories, revision: revisionOf(categories) });
  } catch (err) {
    console.error('catalog GET failed', err);
    res.status(500).json({ error: 'Failed to load catalog' });
  }
});

async function handleCatalogSave(req, res) {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  const categories = req.body?.categories;
  const invalid = validateCatalog(categories);
  if (invalid) return res.status(400).json({ error: invalid });
  try {
    await writes(async () => {
      const [oldCatalog, settings] = await Promise.all([readOrSeedCatalog(), readSettings()]);
      if (isStale(req.body.baseRevision, revisionOf(oldCatalog))) {
        res.status(409).json({ error: 'Catalog changed since it was loaded', conflict: 'catalog' });
        return;
      }
      const oldKeys = extractUploadKeys(oldCatalog);
      const otherKeys = new Set([...extractSettingsKeys(settings), ...(await guideKeysForSave())]);

      await writeCatalog(categories);
      const saved = await readOrSeedCatalog();
      const newKeys = extractUploadKeys(saved);

      const removed = new Set([...oldKeys].filter((k) => !newKeys.has(k) && !otherKeys.has(k)));
      const reAdded = new Set([...newKeys].filter((k) => !oldKeys.has(k)));
      if (removed.size) scheduleForDeletion(removed).catch(console.error);
      if (reAdded.size) unscheduleFiles(reAdded).catch(console.error);

      try {
        await recordVersion(saved);
      } catch (e) {
        console.error('recordVersion failed', e);
      }
      res.json({ ok: true, categories: saved, revision: revisionOf(saved) });
    });
  } catch (err) {
    console.error('catalog save failed', err);
    res.status(500).json({ error: 'Failed to save catalog' });
  }
}

app.post('/api/catalog', handleCatalogSave);
app.put('/api/catalog', handleCatalogSave);

// ─── /api/versions ────────────────────────────────────────────────────────────

app.get('/api/versions', async (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const versions = await listVersions();
    res.json({ versions });
  } catch (err) {
    console.error('versions GET failed', err);
    res.status(500).json({ error: 'Failed to load history' });
  }
});

app.post('/api/versions', async (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  const id = Number(req.body?.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Missing version id' });
  try {
    // A restore is asked for knowingly from «История», so it is not checked
    // against what the admin loaded — only kept from interleaving with a save.
    await writes(async () => {
      const data = await getVersionData(id);
      if (!data) {
        res.status(404).json({ error: 'Version not found' });
        return;
      }
      await writeCatalog(data);
      const saved = await readOrSeedCatalog();
      try {
        await recordVersion(saved);
      } catch (e) {
        console.error('recordVersion (restore) failed', e);
      }
      res.json({ ok: true, categories: saved, revision: revisionOf(saved) });
    });
  } catch (err) {
    console.error('versions POST failed', err);
    res.status(500).json({ error: 'Failed to restore version' });
  }
});

// ─── /api/settings ────────────────────────────────────────────────────────────

function validateSettings(settings) {
  if (!settings || typeof settings !== 'object') return 'settings must be an object';
  const image = settings?.hero?.image;
  if (typeof image !== 'string') return 'hero.image must be a string';
  if (image.length > 2048) return 'hero.image is too long';
  const featured = settings?.featured;
  if (featured !== undefined) {
    if (!Array.isArray(featured)) return 'featured must be an array';
    if (featured.length > 50) return 'featured has too many items';
    if (featured.some((id) => typeof id !== 'string'))
      return 'featured must be a list of product ids';
  }
  return null;
}

app.get('/api/settings', async (req, res) => {
  try {
    const settings = await readSettings();
    res.json({ settings, revision: revisionOf(settings) });
  } catch (err) {
    console.error('settings GET failed', err);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

async function handleSettingsSave(req, res) {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  const invalid = validateSettings(req.body?.settings);
  if (invalid) return res.status(400).json({ error: invalid });
  try {
    await writes(async () => {
      const [oldSettings, catalog] = await Promise.all([readSettings(), readOrSeedCatalog()]);
      if (isStale(req.body.baseRevision, revisionOf(oldSettings))) {
        res
          .status(409)
          .json({ error: 'Settings changed since they were loaded', conflict: 'settings' });
        return;
      }
      const oldKeys = extractSettingsKeys(oldSettings);
      const otherKeys = new Set([...extractUploadKeys(catalog), ...(await guideKeysForSave())]);

      await writeSettings(req.body.settings);
      // Read back rather than trusting what was written: the revision must be
      // the one the next GET will compute, or the next save looks stale.
      const settings = await readSettings();
      const newKeys = extractSettingsKeys(settings);

      const removed = new Set([...oldKeys].filter((k) => !newKeys.has(k) && !otherKeys.has(k)));
      const reAdded = new Set([...newKeys].filter((k) => !oldKeys.has(k)));
      if (removed.size) scheduleForDeletion(removed).catch(console.error);
      if (reAdded.size) unscheduleFiles(reAdded).catch(console.error);

      res.json({ ok: true, settings, revision: revisionOf(settings) });
    });
  } catch (err) {
    console.error('settings save failed', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
}

app.post('/api/settings', handleSettingsSave);
app.put('/api/settings', handleSettingsSave);

// ─── /api/guides — the «Guías» articles ──────────────────────────────────────
//
// Saved one article at a time (see guides.js), in the same queue as the
// catalog and the settings: their saves also decide which uploads are still in
// use, and must not interleave with one. The public read is what a rebuild
// pulls into the prerender; drafts reach only the admin.

const SLUG_TAKEN = { error: 'Another guide already has this address', conflict: 'slug' };
const isUniqueViolation = (err) => err?.code === '23505';
const MAX_GUIDES_ORDERED = 500;

app.get('/api/guides', async (req, res) => {
  try {
    const guides = await listGuides({ includeDrafts: isAuthenticated(req) });
    res.json({ guides });
  } catch (err) {
    console.error('guides GET failed', err);
    res.status(500).json({ error: 'Failed to load guides' });
  }
});

app.post('/api/guides', async (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  const { guide, error } = sanitizeGuide(req.body?.guide);
  if (error) return res.status(400).json({ error });
  try {
    await writes(async () => {
      let saved;
      try {
        saved = await createGuide(guide);
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        res.status(409).json(SLUG_TAKEN);
        return;
      }
      await settleGuideUploads(new Set(), guideUploadKeys(saved));
      res.status(201).json({ guide: saved });
    });
  } catch (err) {
    console.error('guide create failed', err);
    res.status(500).json({ error: 'Failed to create guide' });
  }
});

// Before '/api/guides/:id', which would otherwise take "order" for an id.
app.put('/api/guides/order', async (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  const ids = req.body?.ids;
  const valid =
    Array.isArray(ids) &&
    ids.length <= MAX_GUIDES_ORDERED &&
    ids.every((id) => Number.isSafeInteger(id) && id > 0) &&
    new Set(ids).size === ids.length;
  if (!valid) return res.status(400).json({ error: 'ids must be a list of distinct guide ids' });
  try {
    await writes(async () => {
      await reorderGuides(ids);
      res.json({ guides: await listGuides({ includeDrafts: true }) });
    });
  } catch (err) {
    console.error('guides reorder failed', err);
    res.status(500).json({ error: 'Failed to reorder guides' });
  }
});

app.put('/api/guides/:id', async (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  const id = idParam(req);
  if (!id) return res.status(400).json({ error: 'Invalid guide id' });
  const { guide, error } = sanitizeGuide(req.body?.guide);
  if (error) return res.status(400).json({ error });
  try {
    await writes(async () => {
      const current = await getGuide(id);
      if (!current) {
        res.status(404).json({ error: 'Guide not found' });
        return;
      }
      if (isStale(req.body.baseRevision, current.revision)) {
        res.status(409).json({ error: 'Guide changed since it was loaded', conflict: 'guide' });
        return;
      }
      // Once published, the address may already be in search results and in
      // AI answers; a new one would leave all of those on a redirect.
      if (current.publishedAt && guide.slug !== current.slug) {
        res.status(400).json({ error: 'A published guide keeps its address' });
        return;
      }
      let saved;
      try {
        saved = await updateGuide(id, guide);
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        res.status(409).json(SLUG_TAKEN);
        return;
      }
      if (!saved) {
        res.status(404).json({ error: 'Guide not found' });
        return;
      }
      await settleGuideUploads(guideUploadKeys(current), guideUploadKeys(saved));
      res.json({ guide: saved });
    });
  } catch (err) {
    console.error('guide save failed', err);
    res.status(500).json({ error: 'Failed to save guide' });
  }
});

app.delete('/api/guides/:id', async (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  const id = idParam(req);
  if (!id) return res.status(400).json({ error: 'Invalid guide id' });
  try {
    await writes(async () => {
      const current = await getGuide(id);
      if (!current) {
        res.status(404).json({ error: 'Guide not found' });
        return;
      }
      await deleteGuide(id);
      await settleGuideUploads(guideUploadKeys(current), new Set());
      res.json({ ok: true });
    });
  } catch (err) {
    console.error('guide DELETE failed', err);
    res.status(500).json({ error: 'Failed to delete guide' });
  }
});

// ─── /api/upload — стриминг, изображения (5 МБ) + видео (200 МБ) ─────────────

const WEBP_SIZES = [400, 800, 1600];

async function generateWebpVariants(srcPath, base) {
  for (const w of WEBP_SIZES) {
    try {
      await sharp(srcPath)
        .resize(w, null, { withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(join(UPLOADS_DIR, `${base}_${w}.webp`));
    } catch (err) {
      console.error(`[sharp] ${base}_${w}.webp:`, err.message);
    }
  }
}

const IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};
const VIDEO_TYPES = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/ogg': 'ogv',
  'video/quicktime': 'mov',
};
const ALL_TYPES = { ...IMAGE_TYPES, ...VIDEO_TYPES };
const MAX_IMAGE = 5 * 1024 * 1024;
const MAX_VIDEO = 200 * 1024 * 1024;

app.post('/api/upload', (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });

  const contentType = (req.headers['content-type'] || '').split(';')[0].trim();
  const ext = ALL_TYPES[contentType];
  if (!ext) return res.status(400).json({ error: 'Unsupported file type' });

  const isVideo = contentType.startsWith('video/');
  const maxBytes = isVideo ? MAX_VIDEO : MAX_IMAGE;
  // ?original=discard — keep only the generated WebP variants (reviews).
  const discardOriginal = req.query?.original === 'discard' && !isVideo;
  const tmpPath = join(UPLOADS_DIR, `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const ws = createWriteStream(tmpPath);
  const hash = createHash('sha256');
  let size = 0;
  let done = false;

  const fail = (code, msg) => {
    if (done) return;
    done = true;
    req.destroy();
    ws.destroy();
    try {
      unlinkSync(tmpPath);
    } catch {}
    if (!res.headersSent) res.status(code).json({ error: msg });
  };

  req.on('data', (chunk) => {
    if (done) return;
    size += chunk.length;
    if (size > maxBytes) {
      fail(413, `File too large (max ${isVideo ? '200' : '5'} MB)`);
      return;
    }
    hash.update(chunk);
    ws.write(chunk);
  });

  req.on('end', () => {
    if (done) return;
    ws.end(async () => {
      if (size === 0) {
        fail(400, 'Empty file');
        return;
      }
      done = true;
      const base = hash.digest('hex').slice(0, 32);
      const key = `${base}.${ext}`;
      const finalPath = join(UPLOADS_DIR, key);
      try {
        renameSync(tmpPath, finalPath);
      } catch (err) {
        console.error('upload rename failed', err);
        try {
          unlinkSync(tmpPath);
        } catch {}
        if (!res.headersSent) res.status(500).json({ error: 'Failed to store file' });
        return;
      }
      if (!isVideo && ext !== 'gif') {
        await generateWebpVariants(finalPath, base);
        // Review screenshots are the one upload nothing ever serves in its
        // original form: the site and the lightbox both read the WebP
        // variants, and unlike product photos these never go into the Meta
        // feed, which is the reason originals are kept at all (see
        // server/feed.js). A 1080×1350 PNG is ~0.5–1 MB of dead weight each,
        // so the admin asks us to drop it once the variants exist.
        if (discardOriginal) {
          try {
            unlinkSync(finalPath);
          } catch (err) {
            if (err.code !== 'ENOENT') console.error('upload original cleanup failed', err);
          }
        }
      }
      res.json({ url: `/uploads/${key}` });
    });
  });

  req.on('error', () => fail(500, 'Upload failed'));
  ws.on('error', () => fail(500, 'Storage error'));
});

// ─── /api/order — заявка из корзины → Telegram + email ───────────────────────

const orderRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, try again in a minute' },
});

app.post('/api/order', orderRateLimit, handleOrder);

app.get('/api/orders', async (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const orders = await listOrders();
    res.json({ orders });
  } catch (err) {
    console.error('orders GET failed', err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

// A positive integer id from the URL (an order, an article), or null.
function idParam(req) {
  const id = Number(req.params.id);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

app.delete('/api/orders/:id', async (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  const id = idParam(req);
  if (!id) return res.status(400).json({ error: 'Invalid order id' });
  try {
    const deleted = await deleteOrder(id);
    if (!deleted) return res.status(404).json({ error: 'Order not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('order DELETE failed', err);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// Status and note of an order, from the /admin call-back workflow. Saved on
// their own, not with the catalog: the admin's "Сохранить" is for the catalog
// and settings only.
app.patch('/api/orders/:id', async (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  const id = idParam(req);
  if (!id) return res.status(400).json({ error: 'Invalid order id' });
  const { patch, error } = parseOrderPatch(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const order = await updateOrder(id, patch);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ order });
  } catch (err) {
    console.error('order PATCH failed', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// «Подробности визита»: what the customer did on the site before the order,
// read from nginx's access log on every click and never stored (visit.js).
app.get('/api/orders/:id/visit', async (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  const id = idParam(req);
  if (!id) return res.status(400).json({ error: 'Invalid order id' });
  try {
    const order = await getOrderOrigin(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(await findOrderVisit({ ...order, categories: await readOrSeedCatalog() }));
  } catch (err) {
    console.error('order visit failed', err);
    res.status(500).json({ error: 'Failed to read the visit' });
  }
});

// ─── /api/admin/rebuild — SEO rebuild + deploy, run on GitHub Actions ───────
//
// The button in /admin. Does NOT build on this box — see rebuild.js for why
// (the VPS is a small shared server, already tight on RAM/disk). This just
// asks GitHub to run .github/workflows/rebuild-deploy.yml and reports back
// its status; the actual `vite build` + prerender + deploy happens on GitHub's
// runner.

app.post('/api/admin/rebuild', async (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (!rebuildConfigured()) {
    return res.status(503).json({ error: 'Rebuild not configured (missing GH_REBUILD_TOKEN)' });
  }
  try {
    await triggerRebuild();
    res.json({ ok: true });
    startVideoSweep();
  } catch (err) {
    console.error('[rebuild] trigger failed', err);
    res.status(502).json({ error: 'Failed to start rebuild' });
  }
});

// ─── Нормализация видео ──────────────────────────────────────────────────────
//
// Идёт следом за пересборкой: телефон пишет HEVC, который играет не во всех
// браузерах, а сырой ролик приезжает в разрешении вчетверо больше нужного.
// См. server/video.js — там подробно, почему это не столько про вес, сколько
// про совместимость.
//
// Почему по кнопке, а не при загрузке: на этой машине одно ядро, и кодирование
// в момент, когда админ грузит файл, отобрало бы его у Express и Postgres.
// Пересборка — осознанный редкий момент, когда всплеск нагрузки допустим.
// Проход идемпотентный: уже нормализованные файлы пропускаются по ffprobe.

let videoSweepRunning = false;

async function startVideoSweep() {
  if (videoSweepRunning) {
    console.log('[video] sweep already running, skipping');
    return;
  }
  videoSweepRunning = true;
  try {
    const files = readdirSync(UPLOADS_DIR).filter(isVideoFile);
    console.log(`[video] sweep started over ${files.length} file(s)`);
    const summary = await sweepVideos(UPLOADS_DIR, files);
    const saved = (summary.before - summary.after) / 1024 / 1024;
    console.log(
      `[video] sweep done: ${summary.converted} converted, ${summary.skipped} already fine, ` +
        `${summary.failed} failed, ${saved.toFixed(1)} MB saved`,
    );
    await generateReviewPosters();
  } catch (err) {
    console.error('[video] sweep failed', err);
  } finally {
    videoSweepRunning = false;
  }
}

/**
 * Постеры для видеоотзывов. Только для них: у товарных роликов постер нигде не
 * используется, и плодить рядом с ними неиспользуемые файлы незачем.
 *
 * Путь постера выводится из пути видео (posterFor), а не хранится, поэтому
 * пересъёмка отзыва не может оставить постер от прежнего ролика. Уже
 * существующие не перегенерируем — проход должен оставаться дешёвым.
 */
async function generateReviewPosters() {
  const settings = await readSettings();
  const videos = (settings?.reviews ?? []).map((r) => r?.video).filter(Boolean);
  if (!videos.length) return;

  let made = 0;
  for (const src of videos) {
    const posterUrl = posterFor(src);
    if (!posterUrl) continue;
    const posterPath = join(UPLOADS_DIR, posterUrl.slice(9));
    if (existsSync(posterPath)) continue;
    const videoPath = join(UPLOADS_DIR, src.slice(9));
    if (!existsSync(videoPath)) continue;
    try {
      await extractPoster(videoPath, posterPath);
      // generateWebpVariants ждёт basename без каталога и расширения.
      await generateWebpVariants(posterPath, posterUrl.slice(9).replace(/\.[^.]+$/, ''));
      made += 1;
    } catch (err) {
      console.error(`[video] poster for ${src} failed:`, err.message);
    }
  }
  if (made) console.log(`[video] ${made} review poster(s) generated`);
}

app.get('/api/admin/rebuild/status', async (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (!rebuildConfigured()) return res.json({ configured: false, run: null });
  try {
    const run = await getLatestRun();
    res.json({ configured: true, run });
  } catch (err) {
    console.error('[rebuild] status check failed', err);
    res.status(502).json({ error: 'Failed to check rebuild status' });
  }
});

// ─── /api/health — PM2 / uptime monitoring ───────────────────────────────────

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'ok' });
  } catch (err) {
    console.error('[health] db check failed', err);
    res.status(503).json({ ok: false, db: 'error' });
  }
});

// ─── /feed/*.xml — product feeds ────────────────────────────────────────────
//
// Generated from the live catalog on request (see server/feed.js). Rebuilt at
// most once a minute: the platforms fetch daily or hourly, so the cache exists
// to stop a crawler or a refresh loop from re-serialising 124 products per hit,
// not to hide changes — a minute is well inside the window in which the
// prerendered landing pages are still catching up anyway.
//
// Each feed caches separately: they are fetched by different platforms on
// different schedules, and one warming the other's cache would serve Pinterest
// a feed built for Google.
//
// nginx needs an explicit `location /feed/` rule to reach these (see DEPLOY.md);
// without it the request is answered from disk and 404s silently.
const FEED_TTL_MS = 60 * 1000;

function serveFeed(build, contentType = 'application/xml; charset=utf-8') {
  let cache = null;
  let cachedAt = 0;
  return async (req, res) => {
    try {
      if (!cache || Date.now() - cachedAt > FEED_TTL_MS) {
        cache = build(await readOrSeedCatalog());
        cachedAt = Date.now();
      }
      // noindex: a feed is for its platform to fetch, not for Search to index.
      // It does not affect the platform's own fetch.
      res.set('X-Robots-Tag', 'noindex');
      res.type(contentType).send(cache);
    } catch (err) {
      console.error('feed build failed', err);
      // A 5xx makes the platform retry and report a fetch error. Serving a
      // stale or empty feed instead would quietly pull every item out.
      res.status(503).type('text/plain').send('feed unavailable');
    }
  };
}

app.get('/feed/google.xml', serveFeed(buildGoogleFeed));
app.get('/feed/meta.csv', serveFeed(buildMetaFeed, 'text/csv; charset=utf-8'));
app.get('/feed/pinterest.xml', serveFeed(buildPinterestFeed));

// ─── /api/image/:key — legacy redirect to /uploads/:key ──────────────────────

app.get('/api/image/:key', (req, res) => {
  res.redirect(301, `/uploads/${req.params.key}`);
});

// ─── /api/* catch-all — неизвестные API-маршруты → JSON 404 ─────────────────

// Express 5 / path-to-regexp v8 dropped the bare `*`: a wildcard needs a name,
// and `{...}` makes it optional. `/api/{*splat}` matches exactly what `/api/*`
// used to — `/api/`, `/api/x`, `/api/x/y` — and leaves `/api` to the SPA.
app.all('/api/{*splat}', (req, res) => {
  res.status(404).json({ error: `Unknown API route: ${req.method} ${req.path}` });
});

// ─── SPA fallback — все неизвестные маршруты → index.html ────────────────────
//
// Прошедшие сюда запросы НЕ совпали ни с одним файлом в dist/ — а значит и ни
// с одним из prerender-маршрутов (см. scripts/prerender.mjs), которые лежат в
// dist/<route>/index.html и обслуживаются static-мидлварой выше (строка 39)
// до того, как дойдёт до этого catch-all. Единственные легитимные маршруты,
// не имеющие prerender-снапшота — чисто клиентские (/admin). Legacy catalog
// URLs are handled by the real 301 middleware below, never by the SPA.
// Для /admin отдаём 200, для всего остального — 404, чтобы Google не считал
// несуществующие страницы soft-404 (текст "не найдено" со статусом 200).

const CLIENT_ONLY_ROUTES = [/^\/admin(\/|$)/, /^\/utm(\/|$)/];

// ─── Legacy URL redirects ────────────────────────────────────────────────────
//
// Requests that reach this point matched no prerendered snapshot — which is
// exactly what an outdated catalog URL looks like after a product moves between
// sections in /admin (its address carries the category slug), or after it is
// switched off there. Send those on with a real 301 instead of letting the
// catch-all below answer 404; see redirects.js.
//
// The redirect index is rebuilt from the DB at most once a minute: it only
// changes on an admin save, and this path is 404 traffic, not the hot path.
const INDEX_TTL_MS = 60 * 1000;
let redirectIndex = null;
let redirectIndexAt = 0;

async function currentRedirectIndex() {
  if (!redirectIndex || Date.now() - redirectIndexAt > INDEX_TTL_MS) {
    redirectIndex = buildRedirectIndex(await readOrSeedCatalog());
    redirectIndexAt = Date.now();
  }
  return redirectIndex;
}

// A 301 with no caching headers is kept by the browser for good, so a product
// put back on the site would stay unreachable for everyone who had been sent
// away from it. A day lets search engines treat the move as permanent while
// the owner can still undo it.
const REDIRECT_MAX_AGE_S = 24 * 60 * 60;

app.get('/{*splat}', async (req, res, next) => {
  try {
    const target = resolveRedirect(req.path, await currentRedirectIndex());
    if (target) {
      res.set('Cache-Control', `public, max-age=${REDIRECT_MAX_AGE_S}`);
      return res.redirect(301, withQuery(target, req.originalUrl));
    }
  } catch (err) {
    // A DB hiccup must never keep the page itself from being served.
    console.error('[redirect] lookup failed', err);
  }
  return next();
});

app.get('/{*splat}', (req, res) => {
  const isClientOnlyRoute = CLIENT_ONLY_ROUTES.some((re) => re.test(req.path));
  res.status(isClientOnlyRoute ? 200 : 404).sendFile(join(DIST_DIR, 'index.html'));
});

// ─── Errors ───────────────────────────────────────────────────────────────────
//
// Express's own handler writes the stack trace into the response unless
// NODE_ENV is "production", which it is not on the VPS: a scanner asking for
// `/.env%85` got the server's file paths and library layout back, and left
// eleven lines of stack in err.log per probe. A request the server cannot read
// (a malformed %-escape, a body that is not JSON or is too large — the router
// and body-parser mark those 4xx) is the client's: one line in the log. Anything
// else is ours: 500, logged in full. Neither answer says more than its status.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status >= 400 && err.status < 500 ? err.status : 500;
  if (status < 500) {
    console.warn(`[http] ${status} ${req.method} ${req.originalUrl.slice(0, 200)}: ${err.message}`);
  } else {
    console.error(`[http] ${req.method} ${req.originalUrl.slice(0, 200)} failed`, err);
  }
  const message = status < 500 ? 'Bad request' : 'Internal server error';
  if (req.originalUrl.startsWith('/api/')) return res.status(status).json({ error: message });
  return res.status(status).type('text/plain').send(message);
});

// ─── Start ────────────────────────────────────────────────────────────────────

// Exported (and not started) under test, so the routing can be exercised
// without a database or a port of its own — see index.routes.test.js.
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mirage API → http://0.0.0.0:${PORT}`);
    // Articles that came with this release land in /admin as drafts (guides.js).
    Promise.resolve()
      .then(() => seedGuides(loadGuideSeeds()))
      .then((added) => added.length && console.log(`[guides] seeded: ${added.join(', ')}`))
      .catch((err) => console.error('[guides] seeding failed', err));
    runCleanup();
    setInterval(runCleanup, 60 * 60 * 1000); // hourly
  });
}

export default app;
