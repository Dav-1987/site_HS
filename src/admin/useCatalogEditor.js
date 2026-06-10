import { useEffect, useMemo, useState } from 'react';
import {
  fetchCatalog,
  saveCatalog,
  fetchSettings,
  saveSettings,
} from './api.js';
import { defaultSettings, mergeSettings } from '../data/settings.js';

/**
 * All state + mutations for the catalog editor: loads catalog + settings,
 * tracks dirty flags, and exposes the category/settings mutators and save.
 * Keeping it here leaves CatalogEditor as (mostly) presentational.
 */
export function useCatalogEditor() {
  const [categories, setCategories] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [openIdx, setOpenIdx] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Flat list of every product (for the Featured / related pickers).
  const allProducts = useMemo(
    () =>
      (categories || []).flatMap((c) =>
        c.products.map((p) => ({
          id: p.id,
          name: p.name || p.id,
          categoryName: c.name?.es || c.slug || '',
        })),
      ),
    [categories],
  );

  useEffect(() => {
    fetchCatalog()
      .then((data) => setCategories(data.categories))
      .catch((err) => setLoadError(err.message || 'Не удалось загрузить каталог'));
    // Settings load independently — fall back to defaults so the panel still works.
    fetchSettings()
      .then((data) => setSettings(mergeSettings(data.settings)))
      .catch(() => setSettings(defaultSettings));
  }, []);

  const updateSettings = (next) => {
    setSettings(next);
    setSettingsDirty(true);
    setStatus('');
  };

  const mutate = (next) => {
    setCategories(next);
    setDirty(true);
    setStatus('');
  };

  const updateCategory = (ci, next) =>
    mutate(categories.map((c, i) => (i === ci ? next : c)));
  const removeCategory = (ci) => {
    if (!window.confirm('Удалить эту категорию и все её товары?')) return;
    mutate(categories.filter((_, i) => i !== ci));
    setOpenIdx(null);
  };
  const moveCategory = (ci, dir) => {
    const target = ci + dir;
    if (target < 0 || target >= categories.length) return;
    const next = [...categories];
    [next[ci], next[target]] = [next[target], next[ci]];
    mutate(next);
    setOpenIdx(target);
  };
  const addCategory = () => {
    const n = categories.length + 1;
    mutate([
      ...categories,
      {
        slug: `nueva-categoria-${n}`,
        name: { es: 'Nueva categoría', en: 'New category' },
        tagline: { es: '', en: '' },
        description: { es: '', en: '' },
        image: '',
        imageMobile: '',
        products: [],
      },
    ]);
    setOpenIdx(categories.length);
  };
  const duplicateCategory = (ci) => {
    const src = categories[ci];
    const suffix = Date.now().toString(36);
    const copy = {
      ...src,
      slug: `${src.slug}-copy-${suffix}`,
      products: src.products.map((p) => ({ ...p, id: `${p.id}-copy-${suffix}` })),
    };
    mutate([...categories, copy]);
  };

  const save = async () => {
    setSaving(true);
    setStatus('');
    try {
      if (dirty) {
        const data = await saveCatalog(categories);
        setCategories(data.categories);
        setDirty(false);
      }
      if (settingsDirty) {
        const data = await saveSettings(settings);
        setSettings(mergeSettings(data.settings));
        setSettingsDirty(false);
      }
      setStatus('Сохранено ✓');
    } catch (err) {
      setStatus(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  // Apply a catalog snapshot restored from the history panel.
  const applyRestored = (cats) => {
    setCategories(cats);
    setDirty(false);
    setShowHistory(false);
    setStatus('Восстановлено ✓');
  };

  return {
    categories,
    settings,
    loadError,
    openIdx,
    setOpenIdx,
    dirty,
    settingsDirty,
    saving,
    status,
    showHistory,
    setShowHistory,
    allProducts,
    updateSettings,
    updateCategory,
    removeCategory,
    moveCategory,
    addCategory,
    duplicateCategory,
    save,
    applyRestored,
  };
}
