/**
 * Server entry for static prerendering (no browser).
 *
 * `scripts/prerender.mjs` loads this through Vite's SSR pipeline and calls
 * `render(url)` once per route. The app is SSR-safe: every context initializer
 * guards browser globals (`typeof window`, try/catch around localStorage) and
 * all fetch/document access lives in useEffect — so on the server the tree
 * renders from the bundled defaultCatalog / defaultSettings, which is exactly
 * the content we want crawlers to see.
 *
 * We use renderToStaticMarkup (not renderToString) because the client mounts
 * with createRoot().render() — it replaces #root rather than hydrating — so no
 * hydration markers are needed.
 *
 * Routes are code-split with React.lazy (great for the client bundle), but a
 * single synchronous renderToStaticMarkup pass can't resolve a Suspense
 * boundary — the lazy page just suspends and renders the `null` fallback,
 * leaving <main> empty. So `render` is async: it renders, lets the pending
 * lazy chunk(s) load, and re-renders until the markup stabilizes. The lazy
 * component instances are module-level singletons in App.jsx, so their resolved
 * state carries over between passes.
 */
import { StrictMode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import App from './App.jsx';
import { SettingsProvider } from './settings/SettingsContext.jsx';
import { LanguageProvider } from './i18n/LanguageContext.jsx';
import { CatalogProvider } from './catalog/CatalogContext.jsx';

// Yield to the event loop so pending dynamic import()s (and the microtasks
// React attaches to them) can settle before the next render pass.
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function render(url) {
  const tree = (
    <StrictMode>
      <StaticRouter location={url}>
        <SettingsProvider>
          <LanguageProvider>
            <CatalogProvider>
              <App />
            </CatalogProvider>
          </LanguageProvider>
        </SettingsProvider>
      </StaticRouter>
    </StrictMode>
  );

  // First pass kicks off the lazy route's import(); content suspends to null.
  let html = renderToStaticMarkup(tree);

  // Re-render until the markup stops changing — i.e. every lazy boundary on the
  // path has loaded. Capped so a stuck chunk can't loop forever.
  for (let i = 0; i < 5; i++) {
    await tick();
    const next = renderToStaticMarkup(tree);
    if (next === html) break;
    html = next;
  }

  return html;
}
