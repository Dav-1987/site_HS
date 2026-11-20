import { describe, expect, it } from 'vitest';
import { render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsProvider } from '../settings/SettingsContext.jsx';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { CatalogProvider } from '../catalog/CatalogContext.jsx';
import Header from './Header.jsx';
import Footer from './Footer.jsx';

const catalog = [
  {
    slug: 'espejos',
    name: { es: 'Espejos', en: 'Mirrors' },
    products: [{ id: 'mirror-1', name: 'Espejo', onHomeCatalog: true, visibility: 'listed' }],
  },
];

function renderNavigation(route = '/', settings = {}) {
  const view = render(
    <MemoryRouter initialEntries={[route]}>
      <SettingsProvider initialSettings={settings}>
        <LanguageProvider>
          <CatalogProvider initialCatalog={catalog}>
            <Header />
            <Footer />
          </CatalogProvider>
        </LanguageProvider>
      </SettingsProvider>
    </MemoryRouter>,
  );
  const [desktop, mobile] = view.container.querySelectorAll('header nav');
  const footer = view.container.querySelector('footer');
  return { ...view, desktop, mobile, footer };
}

describe('home navigation and contacts', () => {
  it('shows every contact in the homepage footer', () => {
    const { footer } = renderNavigation();
    expect(footer.id).toBe('home-contacts');
    expect(within(footer).getByText('@mirage_muebles').closest('a').href).toContain(
      'instagram.com',
    );
    expect(within(footer).getByText('@hsmuebles').closest('a').href).toContain('tiktok.com');
    expect(within(footer).getByText('WhatsApp').parentElement.querySelector('a').href).toContain(
      'wa.me',
    );
    expect(within(footer).getByText('+34 614 848 301').closest('a').getAttribute('href')).toBe(
      'tel:+34614848301',
    );
    expect(within(footer).getByRole('button', { name: 'info@hsmuebles.es' })).toBeTruthy();
    expect(within(footer).queryByText('Lun–Vie · 9:00–18:00')).toBeNull();
  });

  it('retains the existing catalog menu and contact page by default', () => {
    const { desktop, mobile } = renderNavigation();
    expect(within(desktop).getByText('Catálogo').closest('a').getAttribute('href')).toBe(
      '/catalogo',
    );
    expect(within(mobile).getByRole('button', { name: /Catálogo/ })).toBeTruthy();
    expect(within(desktop).getByText('Contacto').closest('a').getAttribute('href')).toBe(
      '/contacto',
    );
  });

  it('scrolls both nav items on home and removes the catalog menus when enabled', () => {
    const { desktop, mobile } = renderNavigation('/', {
      homeNavigation: { catalogScroll: true, contactsScroll: true },
    });
    expect(within(desktop).getByText('Catálogo').closest('a').getAttribute('href')).toBe(
      '/#home-catalog',
    );
    expect(within(mobile).getByText('Catálogo').closest('a').getAttribute('href')).toBe(
      '/#home-catalog',
    );
    expect(within(mobile).queryByRole('button', { name: /Catálogo/ })).toBeNull();
    expect(within(desktop).queryByText('Espejos')).toBeNull();
    expect(within(desktop).getByText('Contacto').closest('a').getAttribute('href')).toBe(
      '/#home-contacts',
    );
    expect(within(mobile).getByText('Contacto').closest('a').getAttribute('href')).toBe(
      '/#home-contacts',
    );
  });

  it('keeps regular routes off home and avoids a hidden catalog section', () => {
    const settings = {
      homeNavigation: { catalogScroll: true, contactsScroll: true },
      blocks: { homeCatalog: true, homeCatalogDesktop: false },
    };
    const home = renderNavigation('/', settings);
    expect(within(home.desktop).getByText('Catálogo').closest('a').getAttribute('href')).toBe(
      '/catalogo',
    );
    expect(within(home.mobile).getByText('Catálogo').closest('a').getAttribute('href')).toBe(
      '/#home-catalog',
    );
    home.unmount();
    const other = renderNavigation('/catalogo', settings);
    expect(within(other.desktop).getByText('Catálogo').closest('a').getAttribute('href')).toBe(
      '/catalogo',
    );
    expect(within(other.desktop).getByText('Contacto').closest('a').getAttribute('href')).toBe(
      '/contacto',
    );
    expect(other.footer.id).toBe('');
  });
});
