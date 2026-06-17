import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from '../settings/SettingsContext.jsx';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { CatalogProvider } from '../catalog/CatalogContext.jsx';
import { defaultCatalog } from '../data/catalog.js';
import Product from '../pages/Product.jsx';

const category = defaultCatalog[0];
const product = category.products[0];

function renderProduct() {
  return render(
    <MemoryRouter initialEntries={[`/${category.slug}/${product.id}`]}>
      <SettingsProvider>
        <LanguageProvider>
          <CatalogProvider>
            <Routes>
              <Route path="/:categorySlug/:id" element={<Product />} />
            </Routes>
          </CatalogProvider>
        </LanguageProvider>
      </SettingsProvider>
    </MemoryRouter>,
  );
}

describe('product page order flow', () => {
  it('renders the order CTA with shipping note', () => {
    renderProduct();
    expect(screen.getByText(/¡PEDIR AHORA!/i)).toBeTruthy();
    expect(screen.getByText(/Envío y montaje gratis/i)).toBeTruthy();
  });

  it('opens the order modal when the CTA is clicked', () => {
    renderProduct();
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByText(/¡PEDIR AHORA!/i));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/Solicitar producto/i)).toBeTruthy();
    expect(screen.getByRole('dialog').textContent).toContain(product.name);
  });

  it('closes the modal via the close button', () => {
    renderProduct();
    fireEvent.click(screen.getByText(/¡PEDIR AHORA!/i));
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/Cerrar/i));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows required-field errors when submitting an empty form', () => {
    renderProduct();
    fireEvent.click(screen.getByText(/¡PEDIR AHORA!/i));
    fireEvent.click(screen.getByText(/Enviar solicitud/i));
    const errors = screen.getAllByText(/Este campo es obligatorio/i);
    expect(errors.length).toBeGreaterThanOrEqual(2); // name + phone
  });
});
