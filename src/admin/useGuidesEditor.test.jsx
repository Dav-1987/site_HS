import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

vi.mock('./api.js', () => ({
  fetchGuides: vi.fn(),
  createGuide: vi.fn(),
  saveGuide: vi.fn(),
  reorderGuides: vi.fn(),
  deleteGuide: vi.fn(),
}));

const api = await import('./api.js');
const { useGuidesEditor } = await import('./useGuidesEditor.js');

const lang = (title, extra = {}) => ({
  title,
  description: 'D',
  answer: 'A',
  body: 'B',
  coverAlt: '',
  faq: [],
  keywords: [],
  ...extra,
});

const stored = (id, slug, extra = {}) => ({
  id,
  slug,
  visibility: 'off',
  topic: 'tocadores',
  cover: '',
  products: { category: '', type: '', minWidth: null, maxWidth: null, pinned: [], limit: 4 },
  es: lang(`ES ${slug}`),
  en: lang(`EN ${slug}`),
  revision: `r${id}`,
  publishedAt: null,
  updatedAt: '2026-10-29T10:00:00.000Z',
  ...extra,
});

// The server as a fake: what it stores comes back with a new revision.
const echo = (id, guide) => ({
  guide: { ...stored(id, guide.slug), ...guide, revision: `r${id}-2` },
});

async function mounted(list) {
  api.fetchGuides.mockResolvedValue({ guides: list });
  const hook = renderHook(() => useGuidesEditor());
  await waitFor(() => expect(hook.result.current.guides).not.toBeNull());
  return hook.result;
}

const edit = (result, key, patch) =>
  act(() => result.current.update(key, (d) => ({ ...d, ...patch })));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

describe('useGuidesEditor', () => {
  it('loads every article, nothing to save yet', async () => {
    const result = await mounted([stored(1, 'uno'), stored(2, 'dos')]);
    expect(result.current.guides.map((g) => g.key)).toEqual(['g1', 'g2']);
    expect(result.current.dirty).toBe(false);
  });

  it('says why the articles did not load', async () => {
    api.fetchGuides.mockRejectedValue(new Error('Ошибка запроса (500)'));
    const { result } = renderHook(() => useGuidesEditor());
    await waitFor(() => expect(result.current.loadError).toBe('Ошибка запроса (500)'));
  });

  it('sends only the article changed, with the revision it was loaded at', async () => {
    const result = await mounted([stored(1, 'uno'), stored(2, 'dos')]);
    await edit(result, 'g2', { topic: 'espejos' });
    expect(result.current.dirtyKeys).toEqual(new Set(['g2']));

    api.saveGuide.mockImplementation(async (id, guide) => echo(id, guide));
    await act(() => result.current.save());

    expect(api.saveGuide).toHaveBeenCalledTimes(1);
    const [id, guide, base] = api.saveGuide.mock.calls[0];
    expect([id, guide.topic, base]).toEqual([2, 'espejos', 'r2']);
    expect(guide).not.toHaveProperty('revision');
    expect(result.current.dirty).toBe(false);
    expect(result.current.status).toBe('Сохранено');
    expect(api.reorderGuides).not.toHaveBeenCalled();
  });

  it('creates a new article under its own key, and puts it where the list shows it', async () => {
    const result = await mounted([stored(1, 'uno')]);
    let key;
    act(() => {
      key = result.current.create();
    });
    act(() => result.current.move(key, -1));
    api.createGuide.mockImplementation(async (guide) => echo(7, guide));
    api.reorderGuides.mockResolvedValue({ guides: [] });

    await act(() => result.current.save());

    expect(api.createGuide.mock.calls[0][0]).toMatchObject({
      slug: 'nueva-guia',
      visibility: 'off',
    });
    expect(result.current.guides[0]).toMatchObject({ key, id: 7 });
    expect(api.reorderGuides).toHaveBeenCalledWith([7, 1]);
    expect(result.current.dirty).toBe(false);
  });

  // Nothing is sent: a refused article must not leave the others half-saved.
  it('refuses to publish an article that is not complete, before sending anything', async () => {
    const result = await mounted([stored(1, 'uno'), stored(2, 'dos')]);
    await edit(result, 'g1', { topic: 'espejos' });
    await edit(result, 'g2', { visibility: 'public', en: lang('') });

    await act(() => result.current.save());

    expect(api.saveGuide).not.toHaveBeenCalled();
    expect(result.current.saveError).toMatch(/«ES dos» нельзя опубликовать.*английский: заголовок/);
    expect(result.current.dirty).toBe(true);
  });

  it('refuses an address that is malformed or taken', async () => {
    const result = await mounted([stored(1, 'uno'), stored(2, 'dos')]);
    await edit(result, 'g2', { slug: 'uno' });
    await act(() => result.current.save());
    expect(result.current.saveError).toMatch(/уже у другой статьи/);
  });

  it('names the article another tab saved, then saves over it when asked', async () => {
    const result = await mounted([stored(1, 'uno')]);
    await edit(result, 'g1', { topic: 'espejos' });
    api.saveGuide.mockRejectedValueOnce(
      Object.assign(new Error('changed'), { status: 409, conflict: 'guide' }),
    );
    await act(() => result.current.save());
    expect(result.current.conflict).toEqual({ key: 'g1', name: 'ES uno' });

    api.saveGuide.mockImplementation(async (id, guide) => echo(id, guide));
    await act(() => result.current.overwrite());
    expect(api.saveGuide).toHaveBeenLastCalledWith(1, expect.anything(), undefined);
    expect(result.current.conflict).toBeNull();
  });

  it('turns a taken address into words, naming the article', async () => {
    const result = await mounted([stored(1, 'uno')]);
    await edit(result, 'g1', { slug: 'otro' });
    api.saveGuide.mockRejectedValue(
      Object.assign(new Error('x'), { status: 409, conflict: 'slug' }),
    );
    await act(() => result.current.save());
    expect(result.current.saveError).toBe(
      'адрес «otro» уже у другой статьи — поменяйте его в «ES uno».',
    );
  });

  it('deletes a stored article at once, after asking', async () => {
    const result = await mounted([stored(1, 'uno', { publishedAt: '2026-10-01T00:00:00.000Z' })]);
    api.deleteGuide.mockResolvedValue({ ok: true });
    let gone;
    await act(async () => {
      gone = await result.current.remove('g1');
    });
    expect(window.confirm.mock.calls[0][0]).toMatch(/переадресовывать в раздел «Guías»/);
    expect(gone).toBe(true);
    expect(api.deleteGuide).toHaveBeenCalledWith(1);
    expect(result.current.guides).toEqual([]);
    expect(result.current.dirty).toBe(false);
  });

  it('keeps an article the owner chose not to delete', async () => {
    const result = await mounted([stored(1, 'uno')]);
    window.confirm.mockReturnValue(false);
    await act(() => result.current.remove('g1'));
    expect(api.deleteGuide).not.toHaveBeenCalled();
    expect(result.current.guides).toHaveLength(1);
  });

  it('reloads from the server, dropping the edits after asking', async () => {
    const result = await mounted([stored(1, 'uno')]);
    await edit(result, 'g1', { topic: 'espejos' });
    api.fetchGuides.mockResolvedValue({
      guides: [stored(1, 'uno', { topic: 'luz-y-maquillaje' })],
    });
    await act(() => result.current.reloadFromServer());
    expect(result.current.guides[0].topic).toBe('luz-y-maquillaje');
    expect(result.current.dirty).toBe(false);
  });
});
