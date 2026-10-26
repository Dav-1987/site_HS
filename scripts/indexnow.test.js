// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { INDEXNOW_KEY, changedUrls, main, parseSitemap, submitUrls } from './indexnow.mjs';

const page = (loc, lastmod) => `  <url>
    <loc>${loc}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>weekly</changefreq>
    <xhtml:link rel="alternate" hreflang="en" href="${loc}/en"/>
  </url>`;
const sitemap = (...pages) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.join('\n')}\n</urlset>`;

const HOME = 'https://hsmuebles.es/';
const MIRRORS = 'https://hsmuebles.es/espejos';
const VANITY = 'https://hsmuebles.es/tocadores/Tocador-L-05';
const GONE = 'https://hsmuebles.es/otros-modelos/Espejo-Alto-D02';

const BEFORE = sitemap(
  page(HOME, '2026-10-25'),
  page(MIRRORS, '2026-10-07'),
  page(GONE, '2026-10-09'),
);
const AFTER = sitemap(
  page(HOME, '2026-10-25'),
  page(MIRRORS, '2026-10-26'),
  page(VANITY, '2026-10-26'),
);

describe('the key file', () => {
  it('is published under the key the script sends', () => {
    // IndexNow fetches https://hsmuebles.es/<key>.txt and rejects every ping
    // whose key it does not find there.
    expect(readFileSync(`public/${INDEXNOW_KEY}.txt`, 'utf8').trim()).toBe(INDEXNOW_KEY);
  });
});

describe('parseSitemap', () => {
  it('reads each page with its lastmod, not the language alternates', () => {
    expect([...parseSitemap(BEFORE)]).toEqual([
      [HOME, '2026-10-25'],
      [MIRRORS, '2026-10-07'],
      [GONE, '2026-10-09'],
    ]);
  });

  it('keeps a page without lastmod and survives nothing at all', () => {
    expect([...parseSitemap(sitemap(page(HOME)))]).toEqual([[HOME, '']]);
    expect(parseSitemap(undefined).size).toBe(0);
  });
});

describe('changedUrls', () => {
  it('sends what is new, what changed and what left the sitemap, not the rest', () => {
    expect(changedUrls(BEFORE, AFTER)).toEqual([MIRRORS, VANITY, GONE]);
  });

  it('sends every page when there is nothing to compare with', () => {
    expect(changedUrls('', AFTER)).toEqual([HOME, MIRRORS, VANITY]);
  });

  it('never sends another site’s address', () => {
    expect(changedUrls('', sitemap(page('https://example.com/x', '2026-10-26')))).toEqual([]);
  });
});

describe('submitUrls', () => {
  it('posts the IndexNow request with the key and where it lives', async () => {
    const fetchImpl = vi.fn(async () => ({ status: 202 }));

    await expect(submitUrls([MIRRORS], { fetchImpl })).resolves.toBe(202);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.indexnow.org/indexnow');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      host: 'hsmuebles.es',
      key: INDEXNOW_KEY,
      keyLocation: `https://hsmuebles.es/${INDEXNOW_KEY}.txt`,
      urlList: [MIRRORS],
    });
  });
});

describe('main', () => {
  let dir;
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));

  function files(previous, current) {
    dir = mkdtempSync(join(tmpdir(), 'indexnow-'));
    if (previous !== undefined) writeFileSync(join(dir, 'previous.xml'), previous);
    writeFileSync(join(dir, 'current.xml'), current);
    return ['--previous', join(dir, 'previous.xml'), '--current', join(dir, 'current.xml')];
  }
  const quiet = { log: () => {} };

  it('sends only the changes of a rebuild', async () => {
    const fetchImpl = vi.fn(async () => ({ status: 200 }));
    await expect(main(files(BEFORE, AFTER), { fetchImpl, ...quiet })).resolves.toBe(3);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).urlList).toEqual([MIRRORS, VANITY, GONE]);
  });

  it('sends nothing when the rebuild changed no page', async () => {
    const fetchImpl = vi.fn();
    await expect(main(files(AFTER, AFTER), { fetchImpl, ...quiet })).resolves.toBe(0);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('sends every page when the live sitemap could not be fetched', async () => {
    const fetchImpl = vi.fn(async () => ({ status: 200 }));
    await expect(main(files(undefined, AFTER), { fetchImpl, ...quiet })).resolves.toBe(3);
  });

  it('sends every page with --all', async () => {
    const fetchImpl = vi.fn(async () => ({ status: 202 }));
    const [, , , current] = files(BEFORE, AFTER);
    await expect(main(['--all', current], { fetchImpl, ...quiet })).resolves.toBe(3);
  });

  it('fails loudly when IndexNow refuses, so the workflow shows it', async () => {
    const fetchImpl = vi.fn(async () => ({ status: 403 }));
    await expect(main(files(BEFORE, AFTER), { fetchImpl, ...quiet })).rejects.toThrow(
      'IndexNow answered 403 for 3 URL(s)',
    );
  });

  it('fails when there is no sitemap to read', async () => {
    await expect(main(['--current', 'no/such/sitemap.xml'], quiet)).rejects.toThrow(
      'No sitemap at no/such/sitemap.xml',
    );
  });
});
