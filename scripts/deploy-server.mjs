/**
 * Deploy the Express API (server/) to the VPS.
 *
 * The counterpart of deploy-dist.mjs for the backend: pack the runtime files,
 * snapshot what is live, unpack over it, restart PM2 and check /api/health. A
 * failed check restores the snapshot and restarts again, so a bad release puts
 * the previous API back instead of leaving the site without one.
 *
 * Migrations are NOT applied here — they stay a deliberate manual step
 * (DEPLOY.md, "Миграция раньше фронтенда").
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRemotePaths, normalizeReleaseId, validateRemoteConfig } from './deploy-dist.mjs';

const DEFAULT_HOST = 'root@185.202.172.59';
const DEFAULT_BASE = '/var/www/hs-muebles';
const DEFAULT_SITE_URL = 'https://hsmuebles.es';
const PM2_APP = 'hs-api';
const ARCHIVE = 'server-release.tgz';

// Files outside server/ that the API reads at runtime (DEPLOY.md rules 8 and
// 10): without catalog.js the API does not start at all, and settings.default
// .json is where a newly added setting gets its default.
const SHARED_FILES = ['src/data/catalog.js', 'src/data/settings.default.json'];

/**
 * Everything the API needs on the VPS, relative to the project root: the
 * server modules (tests stay behind), its manifests, and SHARED_FILES.
 */
export function listServerFiles(serverEntries) {
  const modules = serverEntries
    .filter((name) => name.endsWith('.js') && !/\.(test|spec)\.js$/.test(name))
    .sort()
    .map((name) => `server/${name}`);
  return [...modules, 'server/package.json', 'server/package-lock.json', ...SHARED_FILES];
}

export function getServerPaths(base, releaseId) {
  return {
    upload: `${base}/server.release-${releaseId}.tgz`,
    rollback: `${base}/server.rollback.tgz`,
    lock: getRemotePaths(base, releaseId).lock,
  };
}

const quote = (files) => files.map((f) => `'${f}'`).join(' ');

/**
 * Save the live copies of `files` so a failed release can be put back.
 * --ignore-failed-read: a file new in this release has no live copy to save.
 */
export function buildSnapshotCommand(base, paths, files) {
  return `cd ${base} && tar czf ${paths.rollback} --ignore-failed-read ${quote(files)}`;
}

/**
 * Unpack the upload over the live files. --no-same-owner: the archive is
 * built on the CI runner, whose uid means nothing on the VPS.
 */
export function buildInstallCommand(base, paths) {
  return `cd ${base} && tar xzf ${paths.upload} --no-same-owner && rm -f ${paths.upload}`;
}

export function buildRestartCommand(base, { reinstallDeps }) {
  const deps = reinstallDeps ? `cd ${base}/server && npm ci --omit=dev && ` : '';
  return `${deps}pm2 restart ${PM2_APP}`;
}

export function buildRollbackCommand(base, paths, { reinstallDeps }) {
  return `cd ${base} && tar xzf ${paths.rollback} --no-same-owner && ${buildRestartCommand(base, { reinstallDeps })}`;
}

function run(command, args) {
  execFileSync(command, args, { stdio: 'inherit' });
}

function capture(command, args) {
  return execFileSync(command, args, { encoding: 'utf8' });
}

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

async function fetchWithRetry(url, validate, label) {
  let lastError;
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    try {
      const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!validate(JSON.parse(await response.text()))) throw new Error('unexpected response body');
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 10) await new Promise((r) => setTimeout(r, 3_000));
    }
  }
  throw new Error(`${label} failed: ${lastError?.message ?? 'unknown error'}`);
}

async function smokeCheck(siteUrl) {
  await fetchWithRetry(
    `${siteUrl}/api/health`,
    (h) => h.ok === true && h.db === 'ok',
    'API health check',
  );
  // Settings go through server/settings.js on every read — the module most
  // likely to change, and the one the whole home page depends on.
  await fetchWithRetry(
    `${siteUrl}/api/settings`,
    (b) => typeof b?.settings?.blocks === 'object',
    'Settings check',
  );
}

export async function deploy() {
  const releaseId = normalizeReleaseId(
    process.env.RELEASE_ID || process.env.GITHUB_SHA || new Date().toISOString(),
  );
  const host = process.env.VPS_SSH_TARGET || DEFAULT_HOST;
  const base = process.env.VPS_BASE_DIR || DEFAULT_BASE;
  const siteUrl = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, '');
  validateRemoteConfig({ host, base, siteUrl: `${siteUrl}/` });

  const files = listServerFiles(readdirSync(resolve('server')));
  const paths = getServerPaths(base, releaseId);
  run('tar', ['czf', ARCHIVE, '--owner=0', '--group=0', ...files]);

  let lockAcquired = false;
  try {
    // Same lock as the frontend deploy: the two never touch the VPS at once.
    run('ssh', [
      host,
      `mkdir ${paths.lock} && printf '%s\\n' 'server-${releaseId}' > ${paths.lock}/release`,
    ]);
    lockAcquired = true;

    const liveLock = capture('ssh', [
      host,
      `sha256sum ${base}/server/package-lock.json 2>/dev/null | cut -d' ' -f1`,
    ]).trim();
    const reinstallDeps = liveLock !== sha256(readFileSync(resolve('server/package-lock.json')));
    if (reinstallDeps) console.log('server/package-lock.json changed — running npm ci on the VPS');

    run('scp', [ARCHIVE, `${host}:${paths.upload}`]);
    // Nothing live has changed until the snapshot exists; from here on any
    // failure — a half-unpacked archive included — restores it.
    run('ssh', [host, buildSnapshotCommand(base, paths, files)]);
    try {
      run('ssh', [host, buildInstallCommand(base, paths)]);
      run('ssh', [host, buildRestartCommand(base, { reinstallDeps })]);
      await smokeCheck(siteUrl);
    } catch (error) {
      run('ssh', [host, buildRollbackCommand(base, paths, { reinstallDeps })]);
      throw new Error(`${error.message}; previous server restored`);
    }

    console.log(
      `Server ${releaseId} deployed and verified; previous files kept in ${paths.rollback}`,
    );
  } finally {
    if (lockAcquired) run('ssh', [host, `rm -rf ${paths.lock}`]);
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  deploy().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
