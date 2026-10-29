import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import {
  buildInstallCommand,
  buildRestartCommand,
  buildRollbackCommand,
  buildSnapshotCommand,
  getServerPaths,
  listServerFiles,
} from './deploy-server.mjs';

describe('which files a server release carries', () => {
  const files = listServerFiles([
    'index.js',
    'settings.js',
    'settings.test.js',
    'migrate.sql',
    'node_modules',
  ]);

  it('ships the modules and leaves tests, SQL and node_modules behind', () => {
    expect(files).toContain('server/index.js');
    expect(files).toContain('server/settings.js');
    expect(files.some((f) => f.includes('.test.'))).toBe(false);
    expect(files.some((f) => f.includes('migrate.sql') || f.includes('node_modules'))).toBe(false);
  });

  // The API imports these from outside server/ (DEPLOY.md rules 8 and 10);
  // without catalog.js it does not start at all.
  it('ships the files the API reads from src/data', () => {
    expect(files).toContain('src/data/catalog.js');
    expect(files).toContain('src/data/settings.default.json');
    expect(files).toContain('src/data/guides.js');
    expect(files).toContain('src/data/guides.seed.json');
  });

  it('ships the manifests so a dependency change can be installed', () => {
    expect(files).toContain('server/package.json');
    expect(files).toContain('server/package-lock.json');
  });

  // Guards the real tree, not a fixture: the entry point PM2 runs must be in it.
  it('covers the PM2 entry point in the actual repo', () => {
    expect(listServerFiles(readdirSync('server'))).toContain('server/index.js');
  });
});

describe('remote commands', () => {
  const base = '/var/www/hs-muebles';
  const paths = getServerPaths(base, 'r1');

  it('keeps every remote path inside the project and shares the frontend lock', () => {
    expect(paths).toEqual({
      upload: '/var/www/hs-muebles/server.release-r1.tgz',
      rollback: '/var/www/hs-muebles/server.rollback.tgz',
      lock: '/var/www/hs-muebles/.deploy-lock',
    });
  });

  it('snapshots the live copies of exactly the shipped files', () => {
    const cmd = buildSnapshotCommand(base, paths, ['server/index.js', 'src/data/catalog.js']);
    expect(cmd).toBe(
      "cd /var/www/hs-muebles && tar czf /var/www/hs-muebles/server.rollback.tgz --ignore-failed-read 'server/index.js' 'src/data/catalog.js'",
    );
  });

  it('unpacks without the CI runner’s ownership', () => {
    expect(buildInstallCommand(base, paths)).toContain('--no-same-owner');
  });

  it('runs npm ci only when the lockfile changed', () => {
    expect(buildRestartCommand(base, { reinstallDeps: false })).toBe('pm2 restart hs-api');
    expect(buildRestartCommand(base, { reinstallDeps: true })).toBe(
      'cd /var/www/hs-muebles/server && npm ci --omit=dev && pm2 restart hs-api',
    );
  });

  // A rollback after a dependency change has to put the old node_modules back
  // too, or the restored code runs against the new packages.
  it('restores the snapshot and restarts, reinstalling deps if they had changed', () => {
    const cmd = buildRollbackCommand(base, paths, { reinstallDeps: true });
    expect(cmd).toMatch(
      /^cd \/var\/www\/hs-muebles && tar xzf \/var\/www\/hs-muebles\/server\.rollback\.tgz/,
    );
    expect(cmd).toContain('npm ci --omit=dev');
    expect(cmd).toMatch(/pm2 restart hs-api$/);
  });
});
