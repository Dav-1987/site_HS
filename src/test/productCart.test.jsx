import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from '../settings/SettingsContext.jsx';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { CatalogProvider } from '../catalog/CatalogContext.jsx';
import defaultCatalog from '../data/catalog.default.json';
import Product from '../pages/Product.jsx';

const category = defaultCatalog[0];
const product = category.products[0];

function renderProduct() {
  return render(
    <MemoryRouter initialEntries={[`/${category.slug}/${product.id}`]}>
      <SettingsProvider>
        <LanguageProvider>
          <CatalogProvider initialCatalog={defaultCatalog}>
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
  afterEach(() => vi.unstubAllGlobals());

  it('renders the order CTA', () => {
    renderProduct();
    expect(screen.getByText(/¡PEDIR AHORA!/i)).toBeTruthy();
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
    const name = screen.getByLabelText(/Nombre/i);
    const phone = screen.getByLabelText(/Teléfono/i);
    fireEvent.click(screen.getByText(/Enviar solicitud/i));
    const errors = screen.getAllByRole('alert');
    expect(errors).toHaveLength(2);
    expect(name.getAttribute('aria-invalid')).toBe('true');
    expect(phone.getAttribute('aria-invalid')).toBe('true');
    expect(name.getAttribute('aria-describedby')).toBe(errors[0].id);
    expect(phone.getAttribute('aria-describedby')).toBe(errors[1].id);
    expect(document.activeElement).toBe(name);
  });

  it('exposes the product photo as a keyboard-operable zoom button', () => {
    renderProduct();
    const zoom = screen.getByRole('button', { name: /Ampliar/i });
    expect(zoom.tagName).toBe('BUTTON');
    fireEvent.click(zoom);
    expect(screen.getByRole('dialog', { name: new RegExp(product.name, 'i') })).toBeTruthy();
  });

  it('rejects a malformed phone number', () => {
    renderProduct();
    fireEvent.click(screen.getByText(/¡PEDIR AHORA!/i));
    fireEvent.change(screen.getByPlaceholderText('Tu nombre'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByPlaceholderText('+34 600 000 000'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByText(/Enviar solicitud/i));
    expect(screen.getByText(/Introduce un número de teléfono válido/i)).toBeTruthy();
  });

  it('reuses the event id on a network retry and sends no client price', async () => {
    const payloads = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, options) => {
        if (url === '/api/order') {
          payloads.push(JSON.parse(options.body));
          const ok = payloads.length > 1;
          return {
            ok,
            status: ok ? 200 : 503,
            json: async () => (ok ? { ok: true } : { error: 'temporary failure' }),
          };
        }
        return { ok: false, status: 503, json: async () => ({}) };
      }),
    );

    renderProduct();
    fireEvent.click(screen.getByText(/¡PEDIR AHORA!/i));
    fireEvent.change(screen.getByPlaceholderText('Tu nombre'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByPlaceholderText('+34 600 000 000'), {
      target: { value: '+34 600 000 000' },
    });

    const submit = screen.getByText(/Enviar solicitud/i);
    fireEvent.click(submit);
    await waitFor(() => expect(payloads).toHaveLength(1));
    await waitFor(() => expect(submit.disabled).toBe(false));
    fireEvent.click(submit);
    await waitFor(() => expect(payloads).toHaveLength(2));

    expect(payloads[1].eventId).toBe(payloads[0].eventId);
    expect(payloads[0]).toMatchObject({ productId: product.id });
    expect(payloads[0]).not.toHaveProperty('productName');
    expect(payloads[0]).not.toHaveProperty('price');
  });
});
