import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/oswald/300.css';
import '@fontsource/oswald/400.css';
import '@fontsource/oswald/600.css';
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/700.css';
import './index.css';
import App from './App.jsx';
import { SettingsProvider } from './settings/SettingsContext.jsx';
import { LanguageProvider } from './i18n/LanguageContext.jsx';
import { CatalogProvider } from './catalog/CatalogContext.jsx';
import { loadDefaultCatalog } from './data/catalog.js';
import { defaultSettings } from './data/settings.js';
import ClientReady from './components/ClientReady.jsx';

function normalizePath(path) {
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

function clientTree({ initialCatalog, initialSettings } = {}) {
  return (
    <StrictMode>
      <BrowserRouter>
        <SettingsProvider initialSettings={initialSettings}>
          <LanguageProvider>
            <CatalogProvider initialCatalog={initialCatalog}>
              <App />
              <ClientReady />
            </CatalogProvider>
          </LanguageProvider>
        </SettingsProvider>
      </BrowserRouter>
    </StrictMode>
  );
}

async function startClient() {
  const rootElement = document.getElementById('root');
  const prerenderPath = rootElement.dataset.prerenderPath;
  const shouldHydrate =
    rootElement.hasChildNodes() &&
    prerenderPath &&
    normalizePath(prerenderPath) === normalizePath(window.location.pathname);

  if (shouldHydrate) {
    // loadDefaultCatalog() is a versioned, code-split JSON chunk. It is the same
    // snapshot entry-server.jsx used, without duplicating the full catalog into
    // every prerendered HTML page.
    const initialCatalog = await loadDefaultCatalog();
    hydrateRoot(rootElement, clientTree({ initialCatalog, initialSettings: defaultSettings }), {
      onRecoverableError(error) {
        console.error('[hydrate] recoverable error', error);
      },
    });
    return;
  }

  // Client-only routes (/admin) and the Vite dev shell are not prerendered.
  // Remove a fallback homepage snapshot before mounting an unrelated route.
  if (rootElement.hasChildNodes()) rootElement.replaceChildren();
  createRoot(rootElement).render(clientTree());
}

startClient().catch((error) => {
  // A failed catalog chunk should not leave a static, non-interactive page.
  // Fall back to the existing SPA bootstrap; providers will recover from API
  // or local cache just as they do during local development.
  console.error('[bootstrap] hydration failed', error);
  const rootElement = document.getElementById('root');
  rootElement.replaceChildren();
  createRoot(rootElement).render(clientTree());
});
