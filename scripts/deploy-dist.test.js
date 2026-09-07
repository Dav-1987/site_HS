import { describe, expect, it } from 'vitest';
import {
  ASSET_GRACE_DAYS,
  buildAssetCarryOverCommand,
  getRemotePaths,
  normalizeReleaseId,
  validateRemoteConfig,
} from './deploy-dist.mjs';

describe('deployment safety helpers', () => {
  it('normalizes a release ID before using it in remote paths', () => {
    expect(normalizeReleaseId(' refs/heads/main @ 123 ')).toBe('refs-heads-main-123');
    expect(() => normalizeReleaseId('../')).toThrow('letter or number');
  });

  it('rejects an unsafe or overly broad remote path', () => {
    expect(() =>
      validateRemoteConfig({
        host: 'root@example.com',
        base: '/',
        siteUrl: 'https://example.com/',
      }),
    ).toThrow('specific absolute path');
  });

  it('keeps every mutable directory inside the configured project directory', () => {
    expect(getRemotePaths('/var/www/site', 'abc123')).toEqual({
      live: '/var/www/site/dist',
      rollback: '/var/www/site/dist.rollback',
      staging: '/var/www/site/dist.release-abc123',
      failed: '/var/www/site/dist.failed-abc123',
      lock: '/var/www/site/.deploy-lock',
    });
  });
});

describe('carrying assets across a release', () => {
  const paths = getRemotePaths('/var/www/hs-muebles', 'r1');

  // The point of the whole thing: a chunk or stylesheet from the release just
  // replaced stays reachable, so a visitor mid-session and a Clarity replay
  // both still find what the page they loaded asked for.
  it('copies the previous release’s assets into the new one', () => {
    const cmd = buildAssetCarryOverCommand(paths);
    expect(cmd).toContain(`${paths.rollback}/assets/. ${paths.live}/assets/`);
  });

  // Skipping names they share is the whole safety of this: the release being
  // deployed must win, or a stale chunk gets served under a live name. Spelled
  // with --update=none because coreutils warns that -n may change meaning, and
  // the change it warns about is exactly that overwrite; -n stays as the
  // fallback for coreutils older than 9.3.
  it('never overwrites the incoming release, and keeps the old timestamps', () => {
    const cmd = buildAssetCarryOverCommand(paths);
    expect(cmd).toContain('--update=none');
    expect(cmd).toContain('cp -rn');
    expect(cmd).toContain('--preserve=timestamps');
  });

  it('ages out what nothing points at any more', () => {
    expect(buildAssetCarryOverCommand(paths)).toContain(
      `find ${paths.live}/assets -type f -mtime +${ASSET_GRACE_DAYS} -delete`,
    );
    expect(buildAssetCarryOverCommand(paths, 3)).toContain('-mtime +3');
  });

  // It runs on a first deploy too, when there is no previous release, and on a
  // tree where the directory is missing — neither should abort the deploy.
  it('does nothing rather than failing when there is no previous release', () => {
    const cmd = buildAssetCarryOverCommand(paths);
    expect(cmd).toContain(`test -d ${paths.rollback}/assets`);
    expect(cmd).toContain(`test -d ${paths.live}/assets`);
  });

  // The retention window reaches a shell command, so it is not somewhere to
  // accept whatever it is handed.
  it('refuses a retention window that is not a positive whole number', () => {
    for (const bad of [0, -1, 1.5, '14; rm -rf /', null]) {
      expect(() => buildAssetCarryOverCommand(paths, bad)).toThrow('positive whole number');
    }
  });
});
