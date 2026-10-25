// @vitest-environment node
//
// Catalog redirects through the real route (see redirects.js). The catalog read
// is replaced with a fixed one; everything else in the store is the real code.
// What only the route does is checked here: the status, the query string kept,
// and a cache lifetime short enough to undo a switch-off. The slugs are made up
// on purpose: a local build leaves real ones in dist/, and the static files
// would answer before the redirect is ever asked.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('./store.js', async (importOriginal) => ({
  ...(await importOriginal()),
  readOrSeedCatalog: vi.fn(async () => [
    { slug: 'espejos', products: [{ id: 'Espejo-K01', name: 'Espejo | Redondo' }] },
    {
      slug: 'retirados',
      visibility: 'off',
      products: [{ id: 'Espejo-Retirado-01', name: 'Espejo | Arqueado' }],
    },
  ]),
}));

const { default: app } = await import('./index.js');

let server;
let base;

beforeAll(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => new Promise((resolve) => server.close(resolve)));

const get = (path) => fetch(`${base}${path}`, { redirect: 'manual' });

describe('catalog redirects', () => {
  it('sends a switched-off product to its section with the visit tags intact', async () => {
    const res = await get('/retirados/Espejo-Retirado-01?utm_source=chatgpt.com&fbclid=abc');
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('/espejos?utm_source=chatgpt.com&fbclid=abc');
  });

  it('lets browsers keep a redirect for a day, not for good', async () => {
    const res = await get('/retirados/Espejo-Retirado-01');
    expect(res.headers.get('location')).toBe('/espejos');
    expect(res.headers.get('cache-control')).toBe('public, max-age=86400');
  });

  it('passes a page with nothing to redirect to on to the 404 fallback', async () => {
    // The fallback's own status needs a built dist/ (CI tests before building).
    const res = await get('/retirados/ghost-id');
    expect(res.status).not.toBe(301);
    expect(res.headers.get('location')).toBeNull();
  });
});
