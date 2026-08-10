import { describe, expect, it } from 'vitest';
import { getRemotePaths, normalizeReleaseId, validateRemoteConfig } from './deploy-dist.mjs';

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
