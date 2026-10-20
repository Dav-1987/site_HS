import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveCatalog, saveSettings } from './api.js';

const respond = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => vi.unstubAllGlobals());

const sentBody = () => JSON.parse(fetch.mock.calls.at(-1)[1].body);

describe('admin api — saves carry the revision they were based on', () => {
  it('sends the catalog with its base revision', async () => {
    fetch.mockResolvedValue(respond(200, { ok: true, categories: [], revision: 'c2' }));
    await expect(saveCatalog([], 'c1')).resolves.toMatchObject({ revision: 'c2' });
    expect(sentBody()).toEqual({ categories: [], baseRevision: 'c1' });
  });

  it('leaves the revision out of a forced save', async () => {
    fetch.mockResolvedValue(respond(200, { ok: true, settings: {}, revision: 's2' }));
    await saveSettings({}, undefined);
    expect(sentBody()).toEqual({ settings: {} });
  });

  it('rejects a 409 with its status and the part in conflict', async () => {
    fetch.mockResolvedValue(respond(409, { error: 'Catalog changed', conflict: 'catalog' }));
    await expect(saveCatalog([], 'c1')).rejects.toMatchObject({
      status: 409,
      conflict: 'catalog',
      message: 'Catalog changed',
    });
  });

  it('rejects any other failure with its status and no conflict', async () => {
    fetch.mockResolvedValue({ ok: false, status: 502, json: async () => Promise.reject() });
    await expect(saveCatalog([], 'c1')).rejects.toMatchObject({
      status: 502,
      conflict: null,
      message: 'Ошибка запроса (502)',
    });
  });
});
