import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createGuide, deleteGuide, fetchGuides, reorderGuides, saveGuide } from './api.js';
import { applyUpdate } from './update.js';
import { missingLines } from './guideChecks.js';
import {
  draftOf,
  editableOf,
  guideName,
  guideSlugError,
  isGuideDirty,
  moveGuide,
  newGuide,
} from './guideOps.js';

const OVERWRITE_QUESTION =
  'Сохранить вашу статью поверх изменений, сделанных в другой вкладке или на другом устройстве? Те изменения пропадут: у статей нет истории.';
const RELOAD_QUESTION = 'Загрузить статьи с сервера? Ваши несохранённые правки в статьях пропадут.';

/**
 * The «Guías» articles in /admin: loaded once for the whole admin, so an edit
 * survives switching sections, and saved by the toolbar's «Сохранить» together
 * with the catalog and the settings (AdminShell). Unlike those, each article is
 * its own save (server/guides.js): only the ones changed are sent, each with
 * the revision it was loaded at, and a conflict names the article. Deleting is
 * the exception — it asks, and happens at once, like deleting an order.
 */
export function useGuidesEditor() {
  const [guides, setGuides] = useState(null);
  // What the server holds: id → draft, and the ids in its order.
  const [stored, setStored] = useState({});
  const [storedOrder, setStoredOrder] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [saveError, setSaveError] = useState('');
  // The article a save was turned away for: `{ key, name }`.
  const [conflict, setConflict] = useState(null);
  const created = useRef(0);

  const load = useCallback(async () => {
    const { guides: list } = await fetchGuides();
    const drafts = list.map((g) => draftOf(g));
    setGuides(drafts);
    setStored(Object.fromEntries(drafts.map((d) => [d.id, d])));
    setStoredOrder(drafts.map((d) => d.id));
  }, []);

  useEffect(() => {
    Promise.resolve()
      .then(load)
      .catch((err) => setLoadError(err.message || 'Не удалось загрузить статьи'));
  }, [load]);

  const dirtyKeys = useMemo(
    () =>
      new Set(
        (guides ?? []).filter((d) => isGuideDirty(d, d.id && stored[d.id])).map((d) => d.key),
      ),
    [guides, stored],
  );
  const order = (guides ?? []).filter((d) => d.id).map((d) => d.id);
  const orderDirty = order.join() !== storedOrder.join();
  const dirty = dirtyKeys.size > 0 || orderDirty;

  // Leaving the tab with unsaved articles asks first, as the catalog does.
  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  /** Applies `next` (a value or an updater, see ./update.js) to the article `key`. */
  const update = (key, next) => {
    setGuides((list) => list.map((d) => (d.key === key ? applyUpdate(next, d) : d)));
    setStatus('');
  };

  /** Adds a blank draft at the end; returns its key. */
  const create = () => {
    created.current += 1;
    const draft = newGuide(guides ?? [], created.current);
    setGuides((list) => [...list, draft]);
    setStatus('');
    return draft.key;
  };

  const move = (key, dir) => {
    setGuides((list) => moveGuide(list, key, dir));
    setStatus('');
  };

  /** Asks first; deletes at once. Resolves to whether the article went. */
  const remove = async (key) => {
    const draft = guides.find((d) => d.key === key);
    if (!draft) return false;
    const question = draft.publishedAt
      ? `Удалить статью «${guideName(draft)}»? Её адрес будет переадресовывать в раздел «Guías», а сама статья исчезнет с сайта после «Пересобрать сайт». Вернуть её будет нельзя.`
      : `Удалить статью «${guideName(draft)}»? Вернуть её будет нельзя.`;
    if (!window.confirm(question)) return false;
    if (draft.id) {
      setSaving(true);
      setSaveError('');
      try {
        await deleteGuide(draft.id);
      } catch (err) {
        setSaveError(err.message || 'сервер не ответил');
        return false;
      } finally {
        setSaving(false);
      }
      setStored(({ [draft.id]: _gone, ...rest }) => rest);
      setStoredOrder((ids) => ids.filter((id) => id !== draft.id));
    }
    setGuides((list) => list.filter((d) => d.key !== key));
    setStatus('Статья удалена');
    return true;
  };

  // `force` is the key of the article to save without the revision check: the
  // one the owner chose to save over after a conflict.
  const runSave = async (force = null) => {
    setSaving(true);
    setStatus('');
    setSaveError('');
    setConflict(null);
    let next = guides;
    const createdIds = [];
    try {
      const changed = guides.filter((d) => dirtyKeys.has(d.key));
      // Checked before anything is sent, so a refused article never leaves the
      // others half-saved.
      for (const d of changed) {
        const slugError = guideSlugError(guides, d.key, d.slug);
        if (slugError) throw new Error(`«${guideName(d)}»: ${slugError}`);
        if (d.visibility !== 'public') continue;
        const missing = missingLines(d);
        if (missing.length)
          throw new Error(
            `«${guideName(d)}» нельзя опубликовать — не заполнено (${missing.join('; ')}). Допишите или оставьте черновиком.`,
          );
      }
      for (const d of changed) {
        let saved;
        try {
          saved = d.id
            ? await saveGuide(
                d.id,
                editableOf(d),
                force === d.key ? undefined : stored[d.id].revision,
              )
            : await createGuide(editableOf(d));
        } catch (err) {
          if (err.status === 409 && err.conflict === 'guide') {
            setConflict({ key: d.key, name: guideName(d) });
            return;
          }
          if (err.status === 409 && err.conflict === 'slug')
            throw new Error(
              `адрес «${d.slug}» уже у другой статьи — поменяйте его в «${guideName(d)}».`,
            );
          throw err;
        }
        const fresh = draftOf(saved.guide, d.key);
        next = next.map((x) => (x.key === d.key ? fresh : x));
        setGuides((list) => list.map((x) => (x.key === d.key ? fresh : x)));
        setStored((s) => ({ ...s, [fresh.id]: fresh }));
        if (!d.id) createdIds.push(fresh.id);
      }
      // A new article lands at the end on the server; anything else moved is
      // put in the order the list shows.
      const ids = next.filter((d) => d.id).map((d) => d.id);
      const serverOrder = [...storedOrder, ...createdIds];
      if (ids.join() !== serverOrder.join()) await reorderGuides(ids);
      setStoredOrder(ids);
      setStatus('Сохранено');
    } catch (err) {
      setSaveError(err.message || 'сервер не ответил');
    } finally {
      setSaving(false);
    }
  };

  /** After a conflict: asks first, then saves this tab's article over the other. */
  const overwrite = () => {
    if (!conflict || !window.confirm(OVERWRITE_QUESTION)) return;
    runSave(conflict.key);
  };

  /** After a conflict: drops the unsaved article edits, asking first, and reloads. */
  const reloadFromServer = async () => {
    if (dirty && !window.confirm(RELOAD_QUESTION)) return;
    setSaving(true);
    setSaveError('');
    try {
      await load();
      setConflict(null);
      setStatus('Загружена свежая версия');
    } catch (err) {
      setSaveError(err.message || 'сервер не ответил');
    } finally {
      setSaving(false);
    }
  };

  return {
    guides,
    loadError,
    dirty,
    dirtyKeys,
    saving,
    status,
    saveError,
    conflict,
    update,
    create,
    move,
    remove,
    save: () => runSave(),
    overwrite,
    reloadFromServer,
    slugError: (key, slug) => guideSlugError(guides ?? [], key, slug),
  };
}
