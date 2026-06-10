import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { defaultCatalog, findCategory, findProduct } from '../data/catalog.js';

const CatalogContext = createContext(null);
const CACHE_KEY = 'hs_catalog_v2';

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { categories } = JSON.parse(raw);
    return Array.isArray(categories) && categories.length > 0 ? categories : null;
  } catch {
    return null;
  }
}

function writeCache(categories) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ categories }));
  } catch {}
}

/**
 * Holds the live catalog. Starts from localStorage cache (fastest, up-to-date
 * after any previous visit) or the bundled default (first visit / offline),
 * then hydrates from /api/catalog and persists the result back to localStorage.
 */
export function CatalogProvider({ children }) {
  const [categories, setCategories] = useState(() => readCache() ?? defaultCatalog);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/catalog')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && Array.isArray(data?.categories) && data.categories.length > 0) {
          setCategories(data.categories);
          writeCache(data.categories);
        }
      })
      .catch(() => {
        /* keep current state on any failure */
      })
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      categories,
      loaded,
      getCategory: (slug) => findCategory(categories, slug),
      getProduct: (id) => findProduct(categories, id),
    }),
    [categories, loaded],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used within a CatalogProvider');
  return ctx;
}
