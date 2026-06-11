/**
 * One-off script: generate WebP variants for all existing uploads.
 * Run once on the server before deploying the frontend that uses WebP paths.
 *
 *   node /var/www/hs-muebles/server/migrate-webp.js
 */
import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, '../uploads');
const SIZES = [400, 800, 1600];
const SKIP = /\.(gif|mp4|webm|ogv|mov)$/i;
const VARIANT = /_(400|800|1600)\.webp$/;

const files = await readdir(UPLOADS_DIR);
const originals = files.filter((f) => !SKIP.test(f) && !VARIANT.test(f));

console.log(`Processing ${originals.length} images…`);
let ok = 0, skip = 0, fail = 0;

for (const filename of originals) {
  const base = filename.replace(/\.[^.]+$/, '');
  const srcPath = join(UPLOADS_DIR, filename);

  for (const w of SIZES) {
    const outPath = join(UPLOADS_DIR, `${base}_${w}.webp`);
    if (existsSync(outPath)) { skip++; continue; }
    try {
      await sharp(srcPath)
        .resize(w, null, { withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(outPath);
      ok++;
    } catch (err) {
      console.error(`  ✗ ${base}_${w}.webp — ${err.message}`);
      fail++;
    }
  }
}

console.log(`Done. generated=${ok} skipped=${skip} errors=${fail}`);
