import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsProvider } from '../settings/SettingsContext.jsx';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { CatalogProvider } from '../catalog/CatalogContext.jsx';
import { CartProvider } from '../cart/CartContext.jsx';
import Home from '../pages/Home.jsx';
import Catalog from '../pages/Catalog.jsx';
import Contact from '../pages/Contact.jsx';
import Cart from '../pages/Cart.jsx';
import NotFound from '../pages/NotFound.jsx';

// Render a page inside the same provider stack as main.jsx. With no backend,
// the contexts stay on the bundled default catalog (see test/setup.js).
function renderPage(ui, route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <SettingsProvider>
        <LanguageProvider>
          <CatalogProvider>
            <CartProvider>{ui}</CartProvider>
          </CatalogProvider>
        </LanguageProvider>
      </SettingsProvider>
    </MemoryRouter>,
  );
}

describe('page smoke render', () => {
  it('Home renders the hero subtitle', () => {
    renderPage(<Home />);
    expect(screen.getByText(/Creamos muebles de diseño único/i)).toBeTruthy();
  });

  it('Catalog renders its title', () => {
    renderPage(<Catalog />);
    expect(screen.getByText(/Todas las colecciones/i)).toBeTruthy();
  });

  it('Contact renders the page heading and subtitle', () => {
    renderPage(<Contact />);
    expect(screen.getByText(/Contacto/i)).toBeTruthy();
    expect(screen.getByText(/Escríbenos y te responderemos/i)).toBeTruthy();
  });

  it('NotFound renders the 404 code', () => {
    renderPage(<NotFound />);
    expect(screen.getByText('404')).toBeTruthy();
  });

  it('Cart renders the empty state with a catalog link', () => {
    renderPage(<Cart />, '/carrito');
    expect(screen.getByText(/Tu cesta está vacía/i)).toBeTruthy();
    expect(screen.getByText(/Ver catálogo/i)).toBeTruthy();
  });
});
