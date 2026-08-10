/**
 * Server entry for static prerendering (no browser).
 *
 * `scripts/prerender.mjs` loads this through Vite's SSR pipeline and calls
 * `render(url)` once per route. The app is SSR-safe: every context initializer
 * guards browser globals (`typeof window`, try/catch around localStorage) and
 * all fetch/document access lives in useEffect — so on the server the tree
 * renders from the bundled default catalog (loaded once below, then passed in
 * as `initialCatalog`) and defaultSettings, which is exactly the content we
 * want crawlers to see. The client loads the same code-split catalog chunk
 * before hydration (see main.jsx), then refreshes from the live API.
 *
 * Routes are code-split with React.lazy (great for the client bundle), so the
 * prerender must wait for every Suspense boundary before saving the snapshot.
 * renderToPipeableStream's onAllReady callback is the deterministic React API
 * for that job. A previous renderToStaticMarkup retry loop treated two equal
 * fallback renders as "stable" and intermittently shipped an empty <main>.
 */
import { StrictMode } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { PassThrough } from 'node:stream';
import App from './App.jsx';
import { SettingsProvider } from './settings/SettingsContext.jsx';
import { LanguageProvider } from './i18n/LanguageContext.jsx';
import { CatalogProvider } from './catalog/CatalogContext.jsx';
import { loadDefaultCatalog } from './data/catalog.js';
import { defaultSettings } from './data/settings.js';

const RENDER_TIMEOUT_MS = 15_000;

function renderWhenReady(tree) {
  return new Promise((resolve, reject) => {
    const destination = new PassThrough();
    const chunks = [];
    let renderError = null;
    let settled = false;
    let timeout;

    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback(value);
    };

    destination.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    destination.on('error', (error) => finish(reject, error));
    destination.on('end', () => {
      if (renderError) {
        finish(reject, renderError);
        return;
      }
      finish(resolve, Buffer.concat(chunks).toString('utf8'));
    });

    const stream = renderToPipeableStream(tree, {
      onAllReady() {
        if (!settled) stream.pipe(destination);
      },
      onShellError(error) {
        finish(reject, error);
      },
      onError(error) {
        renderError ??= error;
      },
    });

    timeout = setTimeout(() => {
      stream.abort();
      finish(reject, new Error(`SSR render timed out after ${RENDER_TIMEOUT_MS}ms`));
    }, RENDER_TIMEOUT_MS);
  });
}

export async function render(url) {
  const initialCatalog = await loadDefaultCatalog();
  const tree = (
    <StrictMode>
      <StaticRouter location={url}>
        <SettingsProvider initialSettings={defaultSettings}>
          <LanguageProvider>
            <CatalogProvider initialCatalog={initialCatalog}>
              <App />
            </CatalogProvider>
          </LanguageProvider>
        </SettingsProvider>
      </StaticRouter>
    </StrictMode>
  );

  return renderWhenReady(tree);
}
