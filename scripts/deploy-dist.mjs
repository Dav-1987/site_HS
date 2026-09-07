/**
 * Deploy a verified dist/ build to the VPS.
 *
 * Upload to a unique staging directory, validate it, switch releases, then
 * check the exact public frontend release and API/database health. A failed
 * public check restores the previous dist/ automatically.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_HOST = 'root@185.202.172.59';
const DEFAULT_BASE = '/var/www/hs-muebles';
const DEFAULT_SITE_URL = 'https://hsmuebles.es';

export function normalizeReleaseId(value) {
  const releaseId = String(value ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

  if (!/[a-zA-Z0-9]/.test(releaseId)) {
    throw new Error('RELEASE_ID must contain a letter or number');
  }
  return releaseId;
}

export function validateRemoteConfig({ host, base, siteUrl }) {
  if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.:-]+$/.test(host)) {
    throw new Error('VPS_SSH_TARGET has an unsafe format');
  }
  if (!/^\/[a-zA-Z0-9._/-]+$/.test(base) || base === '/' || base.includes('..')) {
    throw new Error('VPS_BASE_DIR must be a specific absolute path');
  }

  const url = new URL(siteUrl);
  if (url.protocol !== 'https:' || url.pathname !== '/') {
    throw new Error('SITE_URL must be an HTTPS origin without a path');
  }
}

export function getRemotePaths(base, releaseId) {
  return {
    live: `${base}/dist`,
    rollback: `${base}/dist.rollback`,
    staging: `${base}/dist.release-${releaseId}`,
    failed: `${base}/dist.failed-${releaseId}`,
    lock: `${base}/.deploy-lock`,
  };
}

// How long a superseded asset stays reachable after the release that built it
// was replaced.
//
// Vite fingerprints every chunk, so each build renames whatever changed. The
// release swap moves the whole directory aside, and with it every old
// filename — which breaks two things that outlive a deploy. A visitor already
// on the site requests a lazily-loaded route chunk (there are two dozen) that
// no longer exists and the page fails to open. And a Clarity replay, which
// does not store CSS but re-fetches it at playback time by the URL recorded
// during the session, renders the page with no stylesheet at all: that is what
// a session from before a deploy looks like, and how this was noticed.
//
// So each release inherits the previous one's assets. Filenames carry a
// content hash, so nothing can collide and the new release always wins on the
// names it shares. They accumulate, which is why they are also aged out: the
// VPS disk runs at 87%, and this is not the place to start filling it.
//
// Timestamps are preserved on the way across, or a carried file would look
// freshly built at every deploy and never age out at all. A chunk that has not
// changed keeps its hash, gets uploaded again with the new release, and so
// stays young for as long as it is really in use — only genuinely orphaned
// files grow old.
export const ASSET_GRACE_DAYS = 14;

export function buildAssetCarryOverCommand(paths, graceDays = ASSET_GRACE_DAYS) {
  if (!Number.isInteger(graceDays) || graceDays < 1) {
    throw new Error('graceDays must be a positive whole number of days');
  }
  return (
    `if test -d ${paths.rollback}/assets && test -d ${paths.live}/assets; then ` +
    // `--update=none` rather than `-n`: coreutils warns that the behaviour of
    // -n "is non-portable and may change in future", and the change it is
    // warning about would mean the carried-over files overwriting the release
    // being deployed — stale JavaScript served silently. The fallback keeps
    // this working on coreutils older than 9.3, which has no --update.
    `{ cp -r --preserve=timestamps --update=none ${paths.rollback}/assets/. ${paths.live}/assets/ 2>/dev/null ` +
    `|| cp -rn --preserve=timestamps ${paths.rollback}/assets/. ${paths.live}/assets/; } || true; ` +
    'fi; ' +
    `if test -d ${paths.live}/assets; then ` +
    `find ${paths.live}/assets -type f -mtime +${graceDays} -delete || true; ` +
    'fi'
  );
}

function run(command, args) {
  execFileSync(command, args, { stdio: 'inherit' });
}

function assertLocalBuild(distDir) {
  for (const file of ['index.html', 'sitemap.xml']) {
    if (!existsSync(resolve(distDir, file))) {
      throw new Error(`Cannot deploy: dist/${file} is missing`);
    }
  }

  const assetsDir = resolve(distDir, 'assets');
  if (!existsSync(assetsDir) || !statSync(assetsDir).isDirectory()) {
    throw new Error('Cannot deploy: dist/assets is missing');
  }
}

function createManifest(distDir, releaseId) {
  const indexPath = resolve(distDir, 'index.html');
  const indexSha256 = createHash('sha256').update(readFileSync(indexPath)).digest('hex');
  const manifest = {
    releaseId,
    commit: process.env.GITHUB_SHA || null,
    deployedAt: new Date().toISOString(),
    indexSha256,
  };
  writeFileSync(resolve(distDir, 'deploy-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

async function fetchWithRetry(url, validate, label) {
  let lastError;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.text();
      if (!validate(body)) throw new Error('unexpected response body');
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 6) await new Promise((resolveDelay) => setTimeout(resolveDelay, 2_000));
    }
  }
  throw new Error(`${label} failed: ${lastError?.message ?? 'unknown error'}`);
}

async function smokeCheck(siteUrl, releaseId) {
  const cacheBust = encodeURIComponent(releaseId);
  await fetchWithRetry(
    `${siteUrl}/deploy-manifest.json?release=${cacheBust}`,
    (body) => JSON.parse(body).releaseId === releaseId,
    'Frontend release check',
  );
  await fetchWithRetry(
    `${siteUrl}/api/health`,
    (body) => {
      const health = JSON.parse(body);
      return health.ok === true && health.db === 'ok';
    },
    'API health check',
  );
}

export async function deploy() {
  const distDir = resolve('dist');
  const releaseId = normalizeReleaseId(
    process.env.RELEASE_ID || process.env.GITHUB_SHA || new Date().toISOString(),
  );
  const host = process.env.VPS_SSH_TARGET || DEFAULT_HOST;
  const base = process.env.VPS_BASE_DIR || DEFAULT_BASE;
  const siteUrl = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, '');
  validateRemoteConfig({ host, base, siteUrl: `${siteUrl}/` });
  assertLocalBuild(distDir);
  createManifest(distDir, releaseId);

  const paths = getRemotePaths(base, releaseId);
  let lockAcquired = false;

  try {
    run('ssh', [
      host,
      `mkdir ${paths.lock} && printf '%s\\n' '${releaseId}' > ${paths.lock}/release`,
    ]);
    lockAcquired = true;

    run('ssh', [host, `test ! -e ${paths.staging}`]);
    run('scp', ['-r', 'dist', `${host}:${paths.staging}`]);
    run('ssh', [
      host,
      `test -f ${paths.staging}/index.html && ` +
        `test -f ${paths.staging}/sitemap.xml && ` +
        `test -f ${paths.staging}/deploy-manifest.json && ` +
        `test -d ${paths.staging}/assets && ` +
        `chmod -R a+rX ${paths.staging}`,
    ]);

    run('ssh', [
      host,
      `rm -rf ${paths.rollback} && ` +
        `if test -e ${paths.live} || test -L ${paths.live}; then ` +
        `mv ${paths.live} ${paths.rollback} && ` +
        `(mv ${paths.staging} ${paths.live} || (mv ${paths.rollback} ${paths.live}; exit 1)); ` +
        `else mv ${paths.staging} ${paths.live}; fi`,
    ]);

    // Before the smoke check, so a release that somehow breaks while inheriting
    // the old files is rolled back like any other.
    run('ssh', [host, buildAssetCarryOverCommand(paths)]);

    try {
      await smokeCheck(siteUrl, releaseId);
    } catch (error) {
      run('ssh', [
        host,
        `rm -rf ${paths.failed} && ` +
          `if test -e ${paths.rollback}; then ` +
          `mv ${paths.live} ${paths.failed} && mv ${paths.rollback} ${paths.live}; ` +
          'fi',
      ]);
      throw new Error(`${error.message}; previous release restored`);
    }

    console.log(
      `Release ${releaseId} deployed and verified; previous release kept in dist.rollback`,
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
