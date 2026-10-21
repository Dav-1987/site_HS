// @vitest-environment node
//
// Routing smoke tests. The 742 lines of route definitions in index.js had no
// coverage at all, which is exactly what the Express 4 → 5 upgrade rewrites:
// path-to-regexp v8 rejects the bare `*`, so a mistake here is a server that
// either refuses to boot or silently 404s every legacy URL and /admin.
//
// Only routes that need neither the database nor a built dist/ are exercised
// here; the rest are checked against the live site after deploy.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import app from './index.js';

let server;
let base;

beforeAll(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => new Promise((resolve) => server.close(resolve)));

const get = (path, init) => fetch(`${base}${path}`, { redirect: 'manual', ...init });

describe('the app boots', () => {
  it('registers its routes without throwing', () => {
    // path-to-regexp validates patterns at registration time, so reaching this
    // point already proves every route string is legal under Express 5.
    expect(server.listening).toBe(true);
  });
});

describe('/api catch-all', () => {
  it('answers an unknown API route with JSON, not the SPA shell', async () => {
    const res = await get('/api/definitely-not-a-route');
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toMatch(/application\/json/);
    expect((await res.json()).error).toMatch(/Unknown API route: GET/);
  });

  it('covers every method, not just GET', async () => {
    const res = await get('/api/definitely-not-a-route', { method: 'POST' });
    expect((await res.json()).error).toMatch(/Unknown API route: POST/);
  });

  it('covers nested paths', async () => {
    const res = await get('/api/one/two/three');
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toMatch(/application\/json/);
  });
});

describe('/api/admin/login', () => {
  it('reports an anonymous visitor as not authenticated', async () => {
    const res = await get('/api/admin/login');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ authed: false });
  });

  it('answers on the legacy path too', async () => {
    expect((await get('/api/admin-login')).status).toBe(200);
  });

  // Checking a password reads the stored hash from Postgres, and these tests
  // run without one — which makes this the cheapest way to prove the thing
  // Express 5 changed for the better: a rejected promise inside an async
  // handler now reaches the error handler as a 500 instead of surfacing as an
  // unhandledRejection that could take the whole API process down.
  it('turns a failing database call into a 500 and stays up', async () => {
    const res = await fetch(`${base}/api/admin/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'definitely-not-the-password' }),
    });
    expect(res.status).toBe(500);
    // The process survived it: the next request is still served.
    expect((await get('/api/admin/login')).status).toBe(200);
  });
});

describe('errors', () => {
  // Express's own handler wrote the stack trace into the page: scanners probing
  // for /.env%85 got the server's file paths back.
  const noStack = (body) => {
    expect(body).not.toMatch(/node_modules|URIError|\bat \w/);
  };

  it('answers a malformed address with a bare 400', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await get('/.env%85');
    expect(res.status).toBe(400);
    expect(res.headers.get('content-type')).toMatch(/text\/plain/);
    const body = await res.text();
    expect(body).toBe('Bad request');
    noStack(body);
    // One line in the log, not a stack per probe.
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]).toHaveLength(1);
    warn.mockRestore();
  });

  it('answers a malformed API address in JSON', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await get('/api/x%c0');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Bad request' });
    warn.mockRestore();
  });

  it('answers a body that is not JSON with a bare 400', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await fetch(`${base}/api/catalog`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    });
    expect(res.status).toBe(400);
    const body = await res.text();
    expect(JSON.parse(body)).toEqual({ error: 'Bad request' });
    noStack(body);
    warn.mockRestore();
  });

  it('answers its own failure without saying what failed', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await fetch(`${base}/api/admin/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'definitely-not-the-password' }),
    });
    expect(res.status).toBe(500);
    const body = await res.text();
    expect(JSON.parse(body)).toEqual({ error: 'Internal server error' });
    noStack(body);
    // Logged in full for us, though.
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});

describe('legacy /api/image/:key', () => {
  it('redirects to the uploads path', async () => {
    const res = await get('/api/image/abc123_400.webp');
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('/uploads/abc123_400.webp');
  });
});

describe('unauthenticated writes', () => {
  it('turns away an upload', async () => {
    const res = await fetch(`${base}/api/upload`, {
      method: 'POST',
      headers: { 'content-type': 'image/jpeg' },
      body: 'not-a-real-image',
    });
    expect(res.status).toBe(401);
  });

  it('turns away a change to an order status', async () => {
    const res = await fetch(`${base}/api/orders/1`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'refused' }),
    });
    expect(res.status).toBe(401);
  });
});

describe('unauthenticated reads', () => {
  it('keeps the visit behind an order to the admin', async () => {
    // It reads the server's access log: visitors' addresses and pages.
    const res = await get('/api/orders/1/visit');
    expect(res.status).toBe(401);
  });
});
