import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import * as api from './api.js';
import { useCatalogEditor } from './useCatalogEditor.js';

// Two tabs on one catalog: the revision each save is based on, the conflict
// when another tab saved first, and the two ways out of it (see
// server/revision.js). The real hook; only the network is mocked.
vi.mock('./api.js', () => ({
  fetchCatalog: vi.fn(),
  saveCatalog: vi.fn(),
  fetchSettings: vi.fn(),
  saveSettings: vi.fn(),
}));

const DRAFT_KEY = 'hs-admin-catalog-draft';

const catalog = (price) => [
  {
    slug: 'espejos',
    name: { es: 'Espejos', en: 'Mirrors' },
    products: [{ id: 'Espejo-F-01', name: 'Espejo', price }],
  },
];
const conflictError = (part) =>
  Object.assign(new Error(`${part} changed`), { status: 409, conflict: part });

const priceOf = (result) => result.current.categories[0].products[0].price;
const setPrice = (result, price) =>
  act(() => result.current.updateProduct('Espejo-F-01', (p) => ({ ...p, price })));
const editSettings = (result) =>
  act(() => result.current.updateSettings((s) => ({ ...s, featured: ['Espejo-F-01'] })));

async function loaded() {
  const hook = renderHook(() => useCatalogEditor());
  await waitFor(() => expect(hook.result.current.categories).not.toBeNull());
  await waitFor(() => expect(hook.result.current.settings).not.toBeNull());
  return hook;
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(api.fetchCatalog)
    .mockReset()
    .mockResolvedValue({ categories: catalog(199), revision: 'c1' });
  vi.mocked(api.fetchSettings).mockReset().mockResolvedValue({ settings: {}, revision: 's1' });
  vi.mocked(api.saveCatalog)
    .mockReset()
    .mockImplementation(async (categories) => ({ categories, revision: 'c2' }));
  vi.mocked(api.saveSettings)
    .mockReset()
    .mockImplementation(async (settings) => ({ settings, revision: 's2' }));
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => vi.restoreAllMocks());

describe('useCatalogEditor — saving over the revision it loaded', () => {
  it('sends back the revision the catalog was loaded at, then the one it saved', async () => {
    const { result } = await loaded();
    setPrice(result, 249);
    await act(() => result.current.save());
    expect(api.saveCatalog).toHaveBeenLastCalledWith(expect.any(Array), 'c1');

    setPrice(result, 299);
    await act(() => result.current.save());
    expect(api.saveCatalog).toHaveBeenLastCalledWith(expect.any(Array), 'c2');
  });

  it('does the same for the settings', async () => {
    const { result } = await loaded();
    editSettings(result);
    await act(() => result.current.save());
    expect(api.saveSettings).toHaveBeenLastCalledWith(expect.any(Object), 's1');
  });

  it('never passes defaults off as the stored settings when they failed to load', async () => {
    vi.mocked(api.fetchSettings).mockRejectedValue(new Error('offline'));
    const { result } = await loaded();
    editSettings(result);
    await act(() => result.current.save());
    expect(api.saveSettings).toHaveBeenLastCalledWith(expect.any(Object), 'not-loaded');
  });
});

describe('useCatalogEditor — when another tab saved first', () => {
  it('stops, keeps the edits, and says which part', async () => {
    vi.mocked(api.saveCatalog).mockRejectedValueOnce(conflictError('catalog'));
    const { result } = await loaded();
    setPrice(result, 249);
    await act(() => result.current.save());

    expect(result.current.conflict).toBe('catalog');
    expect(result.current.saveError).toBe('');
    expect(result.current.dirty).toBe(true);
    expect(priceOf(result)).toBe(249);
  });

  it('saves over the other tab without the check, once confirmed', async () => {
    vi.mocked(api.saveCatalog).mockRejectedValueOnce(conflictError('catalog'));
    const { result } = await loaded();
    setPrice(result, 249);
    await act(() => result.current.save());

    await act(() => result.current.overwrite());
    expect(api.saveCatalog).toHaveBeenLastCalledWith(expect.any(Array), undefined);
    expect(result.current.conflict).toBe(null);
    expect(result.current.dirty).toBe(false);
  });

  it('does not save over it when the owner says no', async () => {
    vi.mocked(api.saveCatalog).mockRejectedValueOnce(conflictError('catalog'));
    const { result } = await loaded();
    setPrice(result, 249);
    await act(() => result.current.save());
    window.confirm.mockReturnValue(false);

    await act(() => result.current.overwrite());
    expect(api.saveCatalog).toHaveBeenCalledTimes(1);
    expect(result.current.conflict).toBe('catalog');
  });

  it('forces only the part in conflict; the other is still checked', async () => {
    vi.mocked(api.saveSettings).mockRejectedValueOnce(conflictError('settings'));
    const { result } = await loaded();
    setPrice(result, 249);
    editSettings(result);
    await act(() => result.current.save());
    expect(result.current.conflict).toBe('settings');
    // The catalog went through before the settings were turned away.
    expect(result.current.dirty).toBe(false);

    await act(() => result.current.overwrite());
    expect(api.saveSettings).toHaveBeenLastCalledWith(expect.any(Object), undefined);
    expect(api.saveCatalog).toHaveBeenCalledTimes(1);
  });

  it('loads the fresh version, dropping the edits once confirmed', async () => {
    vi.mocked(api.saveCatalog).mockRejectedValueOnce(conflictError('catalog'));
    const { result } = await loaded();
    setPrice(result, 249);
    await act(() => result.current.save());

    vi.mocked(api.fetchCatalog).mockResolvedValue({ categories: catalog(229), revision: 'c9' });
    vi.mocked(api.fetchSettings).mockResolvedValue({ settings: {}, revision: 's9' });
    await act(() => result.current.reloadFromServer());

    expect(priceOf(result)).toBe(229);
    expect(result.current.dirty).toBe(false);
    expect(result.current.conflict).toBe(null);
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();

    setPrice(result, 239);
    await act(() => result.current.save());
    expect(api.saveCatalog).toHaveBeenLastCalledWith(expect.any(Array), 'c9');
  });

  it('keeps the edits when the owner declines to load the fresh version', async () => {
    vi.mocked(api.saveCatalog).mockRejectedValueOnce(conflictError('catalog'));
    const { result } = await loaded();
    setPrice(result, 249);
    await act(() => result.current.save());
    window.confirm.mockReturnValue(false);
    vi.mocked(api.fetchCatalog).mockClear();

    await act(() => result.current.reloadFromServer());
    expect(api.fetchCatalog).not.toHaveBeenCalled();
    expect(priceOf(result)).toBe(249);
  });

  it('ends a catalog conflict with a restore from the history', async () => {
    vi.mocked(api.saveCatalog).mockRejectedValueOnce(conflictError('catalog'));
    const { result } = await loaded();
    setPrice(result, 249);
    await act(() => result.current.save());

    act(() => result.current.applyRestored(catalog(149), 'c7'));
    expect(result.current.conflict).toBe(null);
    setPrice(result, 159);
    await act(() => result.current.save());
    expect(api.saveCatalog).toHaveBeenLastCalledWith(expect.any(Array), 'c7');
  });

  it('shows any other failure as before, not as a conflict', async () => {
    vi.mocked(api.saveCatalog).mockRejectedValueOnce(
      Object.assign(new Error('Ошибка запроса (502)'), { status: 502 }),
    );
    const { result } = await loaded();
    setPrice(result, 249);
    await act(() => result.current.save());
    expect(result.current.conflict).toBe(null);
    expect(result.current.saveError).toBe('Ошибка запроса (502)');
  });
});

describe('useCatalogEditor — a draft restored after a reload', () => {
  it('saves against the revision it was drafted on, not the one loaded now', async () => {
    const first = await loaded();
    setPrice(first.result, 249);
    await waitFor(() => expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull());
    first.unmount();

    // Meanwhile another tab saved: the server is at c5 now.
    vi.mocked(api.fetchCatalog).mockResolvedValue({ categories: catalog(399), revision: 'c5' });
    const { result } = await loaded();
    expect(priceOf(result)).toBe(249);

    await act(() => result.current.save());
    expect(api.saveCatalog).toHaveBeenLastCalledWith(expect.any(Array), 'c1');
  });

  it('keeps the drafted settings revision whichever request answers first', async () => {
    const first = await loaded();
    editSettings(first.result);
    await waitFor(() => expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull());
    first.unmount();

    // The settings answer only after the draft was restored from the catalog's.
    let answerSettings;
    vi.mocked(api.fetchSettings).mockReturnValue(
      new Promise((resolve) => {
        answerSettings = resolve;
      }),
    );
    const { result } = await loaded();
    await act(async () => answerSettings({ settings: {}, revision: 's5' }));

    await act(() => result.current.save());
    expect(api.saveSettings).toHaveBeenLastCalledWith(expect.any(Object), 's1');
  });
});
