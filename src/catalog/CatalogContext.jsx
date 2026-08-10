import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  loadDefaultCatalog,
  findCategory,
  findProduct,
  visibleCategories,
} from '../data/catalog.js';

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
 * Holds the live catalog. Hydration starts from `initialCatalog`, matching the
 * prerender exactly; client-only routes start from localStorage or empty. Both
 * paths then refresh from /api/catalog and persist the result back to cache.
 * The bundled default dataset is loaded dynamically for hydration or as the
 * last-resort offline fallback, so it stays outside the critical JS chunk.
 */
export function CatalogProvider({ children, initialCatalog }) {
  // During hydration the prerendered catalog must win over any stale browser
  // cache so the first client tree is byte-for-byte equivalent to the SSR tree.
  const [categories, setCategories] = useState(() => initialCatalog ?? readCache() ?? []);
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

  // `categories` is what every listing renders — hidden sections (see
  // isHiddenCategory) are filtered out of it. `allCategories` keeps them, for
  // lookups by slug/id: a hidden section still has a working page and product
  // URLs, it's just never listed.
  const value = useMemo(
    () => ({
      categories: visibleCategories(categories),
      allCategories: categories,
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
