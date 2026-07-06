import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { loadDefaultCatalog, findCategory, findProduct } from '../data/catalog.js';

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
 * after any previous visit), or `initialCatalog` (only passed by the SSR/
 * prerender entry point — see entry-server.jsx), or empty; then hydrates from
 * /api/catalog and persists the result back to localStorage. The bundled
 * default dataset is only ever loaded (dynamically, off the critical path) if
 * the API is unreachable and there's nothing else to show — prerendering
 * already covers the "meaningful content on first paint" case, so shipping
 * the whole catalog to every visitor's browser isn't worth the bundle size.
 */
export function CatalogProvider({ children, initialCatalog }) {
  const [categories, setCategories] = useState(() => readCache() ?? initialCatalog ?? []);
  const [loaded, setLoaded] = useState(false);
  const hasStartingData = useRef(categories.length > 0);

  useEffect(() => {
    let alive = true;
    fetch('/api/catalog')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (!alive) return;
        if (Array.isArray(data?.categories) && data.categories.length > 0) {
          setCategories(data.categories);
          writeCache(data.categories);
        } else {
          throw new Error('empty catalog response');
        }
      })
      .catch(() => {
        // API unreachable/empty and nothing to show yet (first-ever visit,
        // offline) — load the bundled default as a last-resort fallback.
        if (alive && !hasStartingData.current) {
          loadDefaultCatalog()
            .then((data) => {
              if (alive) setCategories(data);
            })
            .catch(() => {});
        }
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
