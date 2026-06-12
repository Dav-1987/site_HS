import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from '../settings/SettingsContext.jsx';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { CatalogProvider } from '../catalog/CatalogContext.jsx';
import { CartProvider } from '../cart/CartContext.jsx';
import { defaultCatalog } from '../data/catalog.js';
import Product from '../pages/Product.jsx';

// First product of the bundled default catalog (the contexts stay on it in
// tests — see test/setup.js).
const category = defaultCatalog[0];
const product = category.products[0];

function renderProduct() {
  return render(
    <MemoryRouter initialEntries={[`/${category.slug}/${product.id}`]}>
      <SettingsProvider>
        <LanguageProvider>
          <CatalogProvider>
            <CartProvider>
              <Routes>
                <Route path="/:categorySlug/:id" element={<Product />} />
              </Routes>
            </CartProvider>
          </CatalogProvider>
        </LanguageProvider>
      </SettingsProvider>
    </MemoryRouter>,
  );
}

describe('product page cart stepper', () => {
  beforeEach(() => {
    // The cart persists to localStorage; start each test empty.
    window.localStorage.removeItem('hs_cart_v1');
  });

  it('shows the stepper after adding and removes it when qty drops to zero', () => {
    renderProduct();
    const decreaseLabel = `Reducir cantidad: ${product.name}`;

    // Not in cart yet → no stepper.
    expect(screen.queryByLabelText(decreaseLabel)).toBeNull();

    fireEvent.click(screen.getByText(/Añadir a la cesta/i));
    expect(screen.getByLabelText(decreaseLabel)).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    // While the product is in the cart the CTA label stays "Añadido".
    expect(screen.getByText(/Añadido/i)).toBeTruthy();
    expect(screen.queryByText(/Añadir a la cesta/i)).toBeNull();

    // + increments, add button also increments.
    fireEvent.click(screen.getByLabelText(`Aumentar cantidad: ${product.name}`));
    expect(screen.getByText('2')).toBeTruthy();

    // − down to zero removes the product, hides the stepper and restores the label.
    const minus = screen.getByLabelText(decreaseLabel);
    fireEvent.click(minus);
    fireEvent.click(minus);
    expect(screen.queryByLabelText(decreaseLabel)).toBeNull();
    expect(screen.getByText(/Añadir a la cesta/i)).toBeTruthy();
    expect(JSON.parse(window.localStorage.getItem('hs_cart_v1'))).toEqual([]);
  });
});
