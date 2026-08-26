import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from '../settings/SettingsContext.jsx';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { CatalogProvider } from '../catalog/CatalogContext.jsx';
import defaultCatalog from '../data/catalog.default.json';
import { productLabel } from '../data/catalog.js';
import Product from '../pages/Product.jsx';

const category = defaultCatalog[0];
const product = category.products[0];

function renderProduct(catalog = defaultCatalog, path = `/${category.slug}/${product.id}`) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SettingsProvider>
        <LanguageProvider>
          <CatalogProvider initialCatalog={catalog}>
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
    expect(screen.getByText(/Realizar pedido/i)).toBeTruthy();
    // The label the order carries, not the raw `name`: a name may hold the bar
    // that separates the tile name from the full one, and the modal — like the
    // notification the order turns into — shows the name without it.
    expect(screen.getByRole('dialog').textContent).toContain(productLabel(product));
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
    const postalCode = screen.getByLabelText(/Código Postal/i);
    fireEvent.click(screen.getByText(/Confirmar pedido/i));
    const errors = screen.getAllByRole('alert');
    expect(errors).toHaveLength(3);
    expect(name.getAttribute('aria-invalid')).toBe('true');
    expect(phone.getAttribute('aria-invalid')).toBe('true');
    expect(postalCode.getAttribute('aria-invalid')).toBe('true');
    expect(name.getAttribute('aria-describedby')).toBe(errors[0].id);
    expect(phone.getAttribute('aria-describedby')).toBe(errors[1].id);
    expect(postalCode.getAttribute('aria-describedby')).toBe(errors[2].id);
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
    fireEvent.click(screen.getByText(/Confirmar pedido/i));
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
    fireEvent.change(screen.getByPlaceholderText('28001'), { target: { value: '28001' } });

    const submit = screen.getByText(/Confirmar pedido/i);
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

// Same regression as ProductCard: a product saved before its photos were
// uploaded (see addProduct in the admin's CategoryEditor) must still render.
describe('product page without photos', () => {
  const photoless = [
    {
      ...category,
      products: [
        {
          id: 'Tocador-Nuevo',
          name: 'Tocador nuevo',
          price: 0,
          oldPrice: 0,
          images: [],
          media: [],
          material: { es: '', en: '' },
          size: '',
          description: { es: '', en: '' },
        },
      ],
    },
  ];

  it('renders the page with the placeholder instead of throwing', () => {
    const { container } = renderProduct(photoless, `/${category.slug}/Tocador-Nuevo`);
    expect(container.querySelector('h1').textContent).toContain('Tocador nuevo');
    expect(screen.getByText(/¡PEDIR AHORA!/i)).toBeTruthy();
    // The gallery slot shows the branded placeholder, not a broken image.
    expect(container.querySelector('img')).toBeNull();
  });
});
