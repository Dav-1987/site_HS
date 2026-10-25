import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsProvider } from '../settings/SettingsContext.jsx';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { CatalogProvider } from '../catalog/CatalogContext.jsx';

// The admin's sections are addresses of their own (/admin/catalog, …) inside
// the site's single router. Two things App.jsx does on every navigation must
// not happen between them: remount the page under its error boundary (which
// re-checks the session and throws away the edits not saved yet), and report a
// page view to Metrika and the Meta pixel (the owner is not a visitor).

vi.mock('../admin/api.js', () => ({
  getAuthStatus: vi.fn(async () => ({ authed: true })),
  logout: vi.fn(),
  fetchCatalog: vi.fn(async () => ({ categories: [] })),
  fetchSettings: vi.fn(async () => ({ settings: {} })),
  fetchOrders: vi.fn(async () => ({ orders: [] })),
  fetchRebuildStatus: vi.fn(async () => ({ configured: false })),
}));

const api = await import('../admin/api.js');
const { default: App } = await import('../App.jsx');
// App.jsx loads the admin lazily, as a chunk of its own. Left to the first
// render, loading it (~0.5 s alone: the whole admin's code, for the first time
// in this worker) fell inside the 1 s that findByRole waits for the admin's
// nav, and other suites running on the machine pushed it past that. Both tests
// then failed, the second still waiting on the same import. Loaded here, with
// the file's other modules; the lazy route still suspends and then renders the
// admin, from the module already loaded.
await import('../pages/Admin.jsx');

beforeEach(() => {
  window.ym = vi.fn();
  window.fbq = vi.fn();
  localStorage.clear();
  // The site's own providers fetch the public catalog and settings.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) })),
  );
});

afterEach(() => {
  delete window.ym;
  delete window.fbq;
  vi.unstubAllGlobals();
});

async function openAdmin(path) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <SettingsProvider>
        <LanguageProvider>
          <CatalogProvider>
            <App />
          </CatalogProvider>
        </LanguageProvider>
      </SettingsProvider>
    </MemoryRouter>,
  );
  return screen.findByRole('navigation', { name: 'Разделы админки' });
}

describe('moving between admin sections', () => {
  it('keeps the admin mounted: the session is checked once', async () => {
    const nav = await openAdmin('/admin/catalog');
    fireEvent.click(within(nav).getByRole('link', { name: 'Тексты сайта' }));
    fireEvent.click(within(nav).getByRole('link', { name: 'Настройки' }));
    fireEvent.click(within(nav).getByRole('link', { name: 'Каталог' }));

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Каталог');
    expect(api.getAuthStatus).toHaveBeenCalledTimes(1);
    expect(api.fetchCatalog).toHaveBeenCalledTimes(1);
  });

  it('reports no page views', async () => {
    const nav = await openAdmin('/admin/catalog');
    fireEvent.click(within(nav).getByRole('link', { name: 'Главная страница' }));
    fireEvent.click(within(nav).getByRole('link', { name: 'Заявки' }));

    expect(window.ym).not.toHaveBeenCalled();
    expect(window.fbq).not.toHaveBeenCalled();
  });
});
