import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchCatalog, saveCatalog, fetchSettings, saveSettings } from './api.js';
import { defaultSettings, mergeSettings } from '../data/settings.js';
import { isListed, isOff } from '../data/catalog.js';
import * as ops from './catalogOps.js';

// Unsaved-edits draft, kept in localStorage so a reload/closed-tab accident
// doesn't wipe out in-progress work. Cleared once the user saves or
// explicitly declines to restore it.
const DRAFT_KEY = 'hs-admin-catalog-draft';

function readDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeDraft(draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Storage full/unavailable — the draft is a convenience, not critical.
  }
}

// Stands in for the settings revision when they failed to load (see below).
const SETTINGS_NOT_LOADED = 'not-loaded';

// What «Сохранить мои поверх» asks before saving over the other tab's work.
const OVERWRITE_QUESTION = {
  catalog:
    'Сохранить ваш каталог поверх изменений, сделанных в другой вкладке или на другом устройстве? Те изменения можно будет вернуть через «Историю изменений».',
  settings:
    'Сохранить ваши настройки поверх изменений, сделанных в другой вкладке или на другом устройстве? Те изменения пропадут: у настроек нет истории.',
};

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Ignore.
  }
}

/**
 * All state + mutations for the catalog editor: loads catalog + settings,
 * tracks dirty flags, and exposes the category/settings mutators and save.
 * Keeping it here leaves CatalogEditor as (mostly) presentational.
 */
export function useCatalogEditor() {
  const [categories, setCategories] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  // What the last save or restore did. `status` is good news ("Сохранено"),
  // `saveError` why a save failed — kept apart so a failure can't read like
  // the success it was mistaken for when both were one grey line.
  const [status, setStatus] = useState('');
  const [saveError, setSaveError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  // The revisions the catalog and the settings were loaded (or last saved) at,
  // sent back with each save so the server can turn away one that would
  // overwrite a save made meanwhile from another tab or device (409, see
  // server/revision.js). Kept in the draft too: a draft restored after a reload
  // is based on what was loaded back then, not on what the server holds now.
  const revisions = useRef({ catalog: undefined, settings: undefined });
  // The part a save was turned away for — 'catalog' or 'settings' — until the
  // owner loads the fresh version or saves theirs over it.
  const [conflict, setConflict] = useState(null);

  // Flat list of every product (for the Featured / related pickers). `hidden`
  // marks the ones those sections would drop — the product itself is not listed,
  // or its whole section is off — so a card that stops rendering is explainable
  // from the picker instead of looking like a bug.
  const allProducts = useMemo(
    () =>
      (categories || []).flatMap((c) =>
        c.products.map((p) => ({
          id: p.id,
          name: p.name || p.id,
          reference: p.reference || '',
          categoryName: c.name?.es || c.slug || '',
          hidden: !isListed(p) || isOff(c),
        })),
      ),
    [categories],
  );

  // Category picker for "move products to…" — every category as-is, including
  // ones the public site keeps out of its listings (e.g. Otros Modelos): the
  // admin always works with the raw catalog, unfiltered.
  const categoryOptions = useMemo(
    () => (categories || []).map((c) => ({ slug: c.slug, name: c.name?.es || c.slug })),
    [categories],
  );

  useEffect(() => {
    let settingsFromDraft = false;
    fetchCatalog()
      .then((data) => {
        const draft = readDraft();
        if (
          draft?.categories &&
          window.confirm(
            `Найден несохранённый черновик от ${new Date(draft.savedAt).toLocaleString()}. Восстановить его?`,
          )
        ) {
          setCategories(draft.categories);
          setDirty(Boolean(draft.dirty));
          revisions.current.catalog = draft.revisions?.catalog;
          if (draft.settings) {
            settingsFromDraft = true;
            setSettings(mergeSettings(draft.settings));
            setSettingsDirty(Boolean(draft.settingsDirty));
            revisions.current.settings = draft.revisions?.settings;
          }
        } else {
          clearDraft();
          setCategories(data.categories);
          revisions.current.catalog = data.revision;
        }
      })
      .catch((err) => setLoadError(err.message || 'Не удалось загрузить каталог'));
    // Settings load independently — fall back to defaults so the panel still works.
    // (Skipped if a restored draft above already set settings.)
    fetchSettings()
      .then((data) => {
        if (settingsFromDraft) return;
        setSettings((prev) => prev ?? mergeSettings(data.settings));
        revisions.current.settings = data.revision;
      })
      .catch(() => {
        if (settingsFromDraft) return;
        setSettings((prev) => prev ?? defaultSettings);
        // The defaults are not what the server holds, so saving them must not
        // pass for an edit of it: a revision no stored one ever matches.
        revisions.current.settings = SETTINGS_NOT_LOADED;
      });
  }, []);

  // Persist a debounced draft of unsaved edits to localStorage so a stray
  // reload or closed tab can be recovered from on the next visit.
  useEffect(() => {
    if (!categories) return;
    if (!dirty && !settingsDirty) {
      clearDraft();
      return;
    }
    const id = setTimeout(() => {
      writeDraft({
        categories,
        settings,
        dirty,
        settingsDirty,
        revisions: { ...revisions.current },
        savedAt: Date.now(),
      });
    }, 500);
    return () => clearTimeout(id);
  }, [categories, settings, dirty, settingsDirty]);

  // Warn before leaving the tab (reload/close) while there are unsaved edits.
  useEffect(() => {
    const handler = (e) => {
      if (!dirty && !settingsDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty, settingsDirty]);

  const updateSettings = (next) => {
    setSettings(next);
    setSettingsDirty(true);
    setStatus('');
  };

  // Every catalog edit goes through here as a function of the catalog as it is
  // when the change lands — an upload finishes seconds after its file was
  // picked (see ./update.js). The edits themselves find products by id and
  // categories by slug (see ./catalogOps.js), never by their place on screen.
  const mutate = (edit) => {
    setCategories(edit);
    setDirty(true);
    setStatus('');
  };

  const updateProduct = (id, next) => mutate((cats) => ops.updateProduct(cats, id, next));
  /** Adds a blank product to a category; returns its id. */
  const addProduct = (slug) => {
    const product = ops.newProduct(slug);
    mutate((cats) => ops.addProduct(cats, slug, product));
    return product.id;
  };
  /** Copies a product in right after itself; returns the copy's id. */
  const duplicateProduct = (id) => {
    const at = ops.locateProduct(categories, id);
    if (!at) return null;
    const copy = ops.copyOfProduct(categories[at.ci].products[at.pi]);
    mutate((cats) => ops.insertProductAfter(cats, id, copy));
    return copy.id;
  };
  /** Asks first; returns whether the product went. */
  const removeProduct = (id) => {
    if (!window.confirm('Удалить этот товар?')) return false;
    mutate((cats) => ops.removeProduct(cats, id));
    return true;
  };
  const moveProduct = (id, toIndex) => mutate((cats) => ops.moveProduct(cats, id, toIndex));
  const moveProductsTo = (ids, toSlug) => mutate((cats) => ops.moveProductsTo(cats, ids, toSlug));
  const productIdError = (oldId, newId) => ops.productIdError(categories, oldId, newId);
  // A new id follows the product everywhere it is named: «Похожие» lists and
  // gifts in the catalog (catalogOps), and the «Избранное» cards in settings.
  const renameProduct = (oldId, newId) => {
    if (productIdError(oldId, newId)) return;
    mutate((cats) => ops.renameProduct(cats, oldId, newId));
    if (settings?.featuredCards?.some((card) => card.productId === oldId)) {
      updateSettings((s) => ({
        ...s,
        featuredCards: s.featuredCards.map((card) =>
          card.productId === oldId ? { ...card, productId: newId } : card,
        ),
      }));
    }
  };

  const updateCategory = (slug, next) => mutate((cats) => ops.updateCategory(cats, slug, next));
  /** Adds a blank category at the end; returns its slug. */
  const addCategory = () => {
    const category = ops.newCategory(categories);
    mutate((cats) => [...cats, category]);
    return category.slug;
  };
  /** Copies a category and its products to the end; returns the copy's slug. */
  const duplicateCategory = (slug) => {
    const source = categories.find((c) => c.slug === slug);
    if (!source) return null;
    const copy = ops.copyOfCategory(source);
    mutate((cats) => [...cats, copy]);
    return copy.slug;
  };
  /** Asks first; returns whether the category went. */
  const removeCategory = (slug) => {
    if (!window.confirm('Удалить эту категорию и все её товары?')) return false;
    mutate((cats) => ops.removeCategory(cats, slug));
    return true;
  };
  const moveCategory = (slug, dir) => mutate((cats) => ops.moveCategory(cats, slug, dir));
  const categorySlugError = (oldSlug, newSlug) =>
    ops.categorySlugError(categories, oldSlug, newSlug);
  const renameCategory = (oldSlug, newSlug) =>
    mutate((cats) => ops.renameCategory(cats, oldSlug, newSlug));

  // `force` names the part to save without the revision check: the one the
  // owner chose to save over after a conflict. The other part is still checked.
  const runSave = async (force = null) => {
    setSaving(true);
    setStatus('');
    setSaveError('');
    setConflict(null);
    try {
      if (dirty) {
        const base = force === 'catalog' ? undefined : revisions.current.catalog;
        const data = await saveCatalog(categories, base);
        revisions.current.catalog = data.revision;
        setCategories(data.categories);
        setDirty(false);
      }
      if (settingsDirty) {
        const base = force === 'settings' ? undefined : revisions.current.settings;
        const data = await saveSettings(settings, base);
        revisions.current.settings = data.revision;
        setSettings(mergeSettings(data.settings));
        setSettingsDirty(false);
      }
      setStatus('Сохранено');
      clearDraft();
    } catch (err) {
      if (err.status === 409) setConflict(err.conflict === 'settings' ? 'settings' : 'catalog');
      else setSaveError(err.message || 'сервер не ответил');
    } finally {
      setSaving(false);
    }
  };
  const save = () => runSave();

  /** After a conflict: asks first, then saves this tab's version over the other. */
  const overwrite = () => {
    if (!conflict || !window.confirm(OVERWRITE_QUESTION[conflict])) return;
    runSave(conflict);
  };

  /**
   * After a conflict: drops this tab's unsaved edits, asking first, and loads
   * the catalog and the settings as the server holds them now.
   */
  const reloadFromServer = async () => {
    if (
      (dirty || settingsDirty) &&
      !window.confirm('Загрузить версию с сервера? Ваши несохранённые правки пропадут.')
    )
      return;
    setSaving(true);
    setSaveError('');
    try {
      const [catalog, fresh] = await Promise.all([fetchCatalog(), fetchSettings()]);
      revisions.current = { catalog: catalog.revision, settings: fresh.revision };
      setCategories(catalog.categories);
      setSettings(mergeSettings(fresh.settings));
      setDirty(false);
      setSettingsDirty(false);
      setConflict(null);
      clearDraft();
      setStatus('Загружена свежая версия');
    } catch (err) {
      setSaveError(err.message || 'сервер не ответил');
    } finally {
      setSaving(false);
    }
  };

  // Apply a catalog snapshot restored from the history panel. The restore is
  // a save of its own, so a catalog conflict is over; a settings one is not.
  const applyRestored = (cats, revision) => {
    revisions.current.catalog = revision;
    setCategories(cats);
    setDirty(false);
    setConflict((c) => (c === 'catalog' ? null : c));
    setShowHistory(false);
    setStatus('Восстановлено');
  };

  return {
    categories,
    settings,
    loadError,
    dirty,
    settingsDirty,
    saving,
    status,
    saveError,
    conflict,
    showHistory,
    setShowHistory,
    allProducts,
    categoryOptions,
    updateSettings,
    updateProduct,
    addProduct,
    duplicateProduct,
    removeProduct,
    moveProduct,
    moveProductsTo,
    productIdError,
    renameProduct,
    updateCategory,
    addCategory,
    duplicateCategory,
    removeCategory,
    moveCategory,
    categorySlugError,
    renameCategory,
    save,
    overwrite,
    reloadFromServer,
    applyRestored,
  };
}
