import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  loadDefaultCatalog,
  findCategory,
  findProduct,
  liveCatalog,
  listedProducts,
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
        // Returned, not just started: `.finally` below sits on this same chain
        // and marks the catalog `loaded` the moment it settles, so anything
        // gated on `loaded` (Meta/Pinterest view events, computeRelated) has to
        // wait for this fallback to actually land rather than firing against
        // whatever `categories` still was — empty, on the very visit this
        // branch exists for.
        if (alive && !hasStartingData.current) {
          return loadDefaultCatalog()
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

  // Visibility is applied once, here, so every route, lookup and listing on the
  // site agrees on it (see src/data/catalog.js):
  //  - `live` drops everything switched off entirely. It's what the lookups
  //    search, so an off slug/id simply isn't found and the page 404s.
  //  - `allCategories` is that live catalog: unlisted sections still have a
  //    working page and product URLs, they're just never linked to.
  //  - `categories` is what every listing renders — public sections only, each
  //    with the products hidden from listings already stripped out.
  const value = useMemo(() => {
    const live = liveCatalog(categories);
    const listed = visibleCategories(live).map((c) => {
      const products = listedProducts(c);
      return products.length === c.products.length ? c : { ...c, products };
    });
    return {
      categories: listed,
      allCategories: live,
      loaded,
      getCategory: (slug) => findCategory(live, slug),
      getProduct: (id) => findProduct(live, id),
    };
  }, [categories, loaded]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used within a CatalogProvider');
  return ctx;
}

/**
 * The catalog if a provider is above, and null if there isn't — for decorative
 * reads that must never be the reason a tree fails to render. `useCatalog`
 * stays strict: anything that cannot do its job without the catalog should say
 * so loudly rather than render half of itself.
 */
export function useOptionalCatalog() {
  return useContext(CatalogContext);
}
