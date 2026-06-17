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
 */
import { StrictMode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import App from './App.jsx';
import { SettingsProvider } from './settings/SettingsContext.jsx';
import { LanguageProvider } from './i18n/LanguageContext.jsx';
import { CatalogProvider } from './catalog/CatalogContext.jsx';

export function render(url) {
  return renderToStaticMarkup(
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
    </StrictMode>,
  );
}
