import express from 'express';
import { createHash } from 'node:crypto';
import { createWriteStream, existsSync, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { verifyPassword, createSessionToken, sessionCookie, clearCookie, isAuthenticated } from './auth.js';
import { readOrSeedCatalog, writeCatalog, recordVersion, listVersions, getVersionData,
         extractUploadKeys, scheduleForDeletion, unscheduleFiles,
         getFilesReadyToDelete, purgePendingRecords } from './store.js';
import { readSettings, writeSettings } from './settings.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, '../uploads');

if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Статика ─────────────────────────────────────────────────────────────────

const DIST_DIR = join(__dirname, '../dist');

// Загруженные картинки
app.use('/uploads', express.static(UPLOADS_DIR, {
  maxAge: '1y',
  immutable: true,
}));

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
function handleLoginPost(req, res) {
  if (!verifyPassword(req.body?.password)) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  const token = createSessionToken();
  res.setHeader('Set-Cookie', sessionCookie(token));
  res.json({ ok: true });
}

app.get(['/api/admin/login', '/api/admin-login'], handleLoginGet);
app.delete(['/api/admin/login', '/api/admin-login'], handleLoginDelete);
app.post(['/api/admin/login', '/api/admin-login'], handleLoginPost);

// ─── Orphaned-upload cleanup ──────────────────────────────────────────────────

function extractSettingsKeys(settings) {
  const keys = new Set();
  const add = (url) => {
    if (typeof url === 'string' && url.startsWith('/uploads/')) keys.add(url.slice(9));
  };
  add(settings?.hero?.image);
  add(settings?.hero?.imageMobile);
  add(settings?.hero?.video);
  return keys;
}

async function collectAllActiveKeys() {
  const [catalog, settings] = await Promise.all([readOrSeedCatalog(), readSettings()]);
  const keys = extractUploadKeys(catalog);
  for (const k of extractSettingsKeys(settings)) keys.add(k);
  return keys;
}

async function runCleanup() {
  try {
    const due = await getFilesReadyToDelete();
    if (!due.length) return;
    const active = await collectAllActiveKeys();
    const toDelete = due.filter((f) => !active.has(f));
    const done = [];
    for (const filename of toDelete) {
      try {
        unlinkSync(join(UPLOADS_DIR, filename));
        const base = filename.replace(/\.[^.]+$/, '');
        for (const w of WEBP_SIZES) {
          try { unlinkSync(join(UPLOADS_DIR, `${base}_${w}.webp`)); } catch {}
        }
        console.log(`[cleanup] deleted: ${filename}`);
      } catch (err) {
        if (err.code !== 'ENOENT') { console.error(`[cleanup] failed to delete ${filename}:`, err); continue; }
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

function validateCatalog(categories) {
  if (!Array.isArray(categories)) return 'categories must be an array';
  const slugs = new Set();
  const ids = new Set();
  for (const c of categories) {
    if (!c?.slug || typeof c.slug !== 'string') return 'every category needs a slug';
    if (slugs.has(c.slug)) return `duplicate category slug: ${c.slug}`;
    slugs.add(c.slug);
    if (!c.name?.es || !c.name?.en) return `category "${c.slug}" needs name.es and name.en`;
    if (!Array.isArray(c.products)) return `category "${c.slug}" needs a products array`;
    for (const p of c.products) {
      if (!p?.id || typeof p.id !== 'string') return `every product in "${c.slug}" needs an id`;
      if (ids.has(p.id)) return `duplicate product id: ${p.id}`;
      ids.add(p.id);
      if (!p.name) return `product "${p.id}" needs a name`;
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

app.get('/api/catalog', async (req, res) => {
  try {
    const categories = await readOrSeedCatalog();
    res.json({ categories });
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
    const [oldCatalog, settings] = await Promise.all([readOrSeedCatalog(), readSettings()]);
    const oldKeys = extractUploadKeys(oldCatalog);
    const settingsKeys = extractSettingsKeys(settings);

    await writeCatalog(categories);
    const saved = await readOrSeedCatalog();
    const newKeys = extractUploadKeys(saved);

    const removed = new Set([...oldKeys].filter((k) => !newKeys.has(k) && !settingsKeys.has(k)));
    const reAdded = new Set([...newKeys].filter((k) => !oldKeys.has(k)));
    if (removed.size) scheduleForDeletion(removed).catch(console.error);
    if (reAdded.size) unscheduleFiles(reAdded).catch(console.error);

    try { await recordVersion(saved); } catch (e) { console.error('recordVersion failed', e); }
    res.json({ ok: true, categories: saved });
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
    const data = await getVersionData(id);
    if (!data) return res.status(404).json({ error: 'Version not found' });
    await writeCatalog(data);
    const saved = await readOrSeedCatalog();
    try { await recordVersion(saved); } catch (e) { console.error('recordVersion (restore) failed', e); }
    res.json({ ok: true, categories: saved });
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
    res.json({ settings });
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
    const [oldSettings, catalog] = await Promise.all([readSettings(), readOrSeedCatalog()]);
    const oldKeys = extractSettingsKeys(oldSettings);
    const catalogKeys = extractUploadKeys(catalog);

    const settings = await writeSettings(req.body.settings);
    const newKeys = extractSettingsKeys(settings);

    const removed = new Set([...oldKeys].filter((k) => !newKeys.has(k) && !catalogKeys.has(k)));
    const reAdded = new Set([...newKeys].filter((k) => !oldKeys.has(k)));
    if (removed.size) scheduleForDeletion(removed).catch(console.error);
    if (reAdded.size) unscheduleFiles(reAdded).catch(console.error);

    res.json({ ok: true, settings });
  } catch (err) {
    console.error('settings save failed', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
}

app.post('/api/settings', handleSettingsSave);
app.put('/api/settings', handleSettingsSave);

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
    try { unlinkSync(tmpPath); } catch {}
    if (!res.headersSent) res.status(code).json({ error: msg });
  };

  req.on('data', (chunk) => {
    if (done) return;
    size += chunk.length;
    if (size > maxBytes) { fail(413, `File too large (max ${isVideo ? '200' : '5'} MB)`); return; }
    hash.update(chunk);
    ws.write(chunk);
  });

  req.on('end', () => {
    if (done) return;
    ws.end(async () => {
      if (size === 0) { fail(400, 'Empty file'); return; }
      done = true;
      const base = hash.digest('hex').slice(0, 32);
      const key = `${base}.${ext}`;
      const finalPath = join(UPLOADS_DIR, key);
      try {
        renameSync(tmpPath, finalPath);
      } catch (err) {
        console.error('upload rename failed', err);
        try { unlinkSync(tmpPath); } catch {}
        if (!res.headersSent) res.status(500).json({ error: 'Failed to store file' });
        return;
      }
      if (!isVideo && ext !== 'gif') {
        await generateWebpVariants(finalPath, base);
      }
      res.json({ url: `/uploads/${key}` });
    });
  });

  req.on('error', () => fail(500, 'Upload failed'));
  ws.on('error', () => fail(500, 'Storage error'));
});

// ─── /api/image/:key — legacy redirect to /uploads/:key ──────────────────────

app.get('/api/image/:key', (req, res) => {
  res.redirect(301, `/uploads/${req.params.key}`);
});

// ─── SPA fallback — все неизвестные маршруты → index.html ────────────────────

app.get('*', (req, res) => {
  res.sendFile(join(DIST_DIR, 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log(`HS API → http://0.0.0.0:${PORT}`);
  runCleanup();
  setInterval(runCleanup, 60 * 60 * 1000); // hourly
});
