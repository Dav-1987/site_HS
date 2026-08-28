import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from '../settings/SettingsContext.jsx';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { CatalogProvider } from '../catalog/CatalogContext.jsx';
import defaultCatalog from '../data/catalog.default.json';
import { productFullName, productLabel } from '../data/catalog.js';
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
              <Route path="/en/:categorySlug/:id" element={<Product />} />
            </Routes>
          </CatalogProvider>
        </LanguageProvider>
      </SettingsProvider>
    </MemoryRouter>,
  );
}

describe('product page order flow', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete window.fbq;
    delete window.gtag;
  });

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

  it('defaults to Spain and localizes the approved country options', () => {
    const spanish = renderProduct();
    fireEvent.click(screen.getByText(/¡PEDIR AHORA!/i));
    const country = screen.getByLabelText(/País de entrega/i);
    expect(country.value).toBe('ES');
    expect([...country.options].map((option) => option.textContent)).toEqual([
      'España',
      'Francia',
      'Portugal',
    ]);

    spanish.unmount();
    renderProduct(defaultCatalog, `/en/${category.slug}/${product.id}`);
    fireEvent.click(screen.getByText(/ORDER NOW/i));
    expect(
      [...screen.getByLabelText(/Delivery country/i).options].map((option) => option.textContent),
    ).toEqual(['Spain', 'France', 'Portugal']);
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
    fireEvent.change(screen.getByLabelText(/Teléfono/i), { target: { value: 'abc' } });
    fireEvent.click(screen.getByText(/Confirmar pedido/i));
    expect(screen.getByText(/Introduce un número de teléfono válido/i)).toBeTruthy();
  });

  it('reuses the event id on a network retry and sends no client price', async () => {
    const payloads = [];
    const fbq = vi.fn();
    window.fbq = fbq;
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
    fireEvent.change(screen.getByLabelText(/Teléfono/i), {
      target: { value: '+34 600 000 000' },
    });
    fireEvent.change(screen.getByLabelText(/Código Postal/i), { target: { value: '28001' } });

    const submit = screen.getByText(/Confirmar pedido/i);
    fireEvent.click(submit);
    await waitFor(() => expect(payloads).toHaveLength(1));
    expect(fbq.mock.calls.filter((call) => call[0] === 'track' && call[1] === 'Lead')).toHaveLength(
      0,
    );
    await waitFor(() => expect(submit.disabled).toBe(false));
    fireEvent.click(submit);
    await waitFor(() => expect(payloads).toHaveLength(2));

    expect(payloads[1].eventId).toBe(payloads[0].eventId);
    expect(payloads[0]).toMatchObject({ productId: product.id, country: 'ES' });
    expect(payloads[0]).not.toHaveProperty('productName');
    expect(payloads[0]).not.toHaveProperty('price');
    const leadCalls = fbq.mock.calls.filter((call) => call[0] === 'track' && call[1] === 'Lead');
    expect(leadCalls).toHaveLength(1);
    expect(leadCalls[0][3]).toEqual({ eventID: payloads[0].eventId });
  });

  it('sends France with an Armenian phone to Meta and Google exactly once', async () => {
    let apiPayload;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, options) => {
        if (url === '/api/order') {
          apiPayload = JSON.parse(options.body);
          return { ok: true, status: 200, json: async () => ({ ok: true }) };
        }
        return { ok: false, status: 503, json: async () => ({}) };
      }),
    );
    const fbq = vi.fn();
    const gtag = vi.fn();
    window.fbq = fbq;
    window.gtag = gtag;

    renderProduct();
    fireEvent.click(screen.getByText(/¡PEDIR AHORA!/i));
    fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Marie Dupont' } });
    fireEvent.change(screen.getByLabelText(/País de entrega/i), { target: { value: 'FR' } });
    fireEvent.change(screen.getByLabelText(/Teléfono/i), {
      target: { value: '+374 99 123456' },
    });
    fireEvent.change(screen.getByLabelText(/Código Postal/i), { target: { value: '75001' } });
    fireEvent.click(screen.getByText(/Confirmar pedido/i));

    await waitFor(() => expect(apiPayload).toBeTruthy());
    await waitFor(() => expect(screen.getByText(/¡Gracias, Marie Dupont!/i)).toBeTruthy());
    expect(apiPayload).toMatchObject({
      country: 'FR',
      phone: '+374 99 123456',
      postalCode: '75001',
    });

    const leadCalls = fbq.mock.calls.filter((call) => call[0] === 'track' && call[1] === 'Lead');
    expect(leadCalls).toHaveLength(1);
    expect(leadCalls[0][3]).toEqual({ eventID: apiPayload.eventId });
    expect(fbq).toHaveBeenCalledWith('init', expect.any(String), {
      ph: '37499123456',
      cn: 'fr',
      zp: '75001',
      fn: 'marie',
      ln: 'dupont',
    });

    const setUserDataIndex = gtag.mock.calls.findIndex(
      (call) => call[0] === 'set' && call[1] === 'user_data',
    );
    const conversionIndex = gtag.mock.calls.findIndex(
      (call) => call[0] === 'event' && call[1] === 'conversion',
    );
    expect(setUserDataIndex).toBeGreaterThanOrEqual(0);
    expect(conversionIndex).toBeGreaterThan(setUserDataIndex);
    expect(gtag.mock.calls[setUserDataIndex][2]).toMatchObject({
      phone_number: '+37499123456',
      address: { country: 'FR', postal_code: '75001' },
    });
    expect(JSON.stringify(gtag.mock.calls)).not.toContain('email');
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

// The caption is not stored anywhere: it is the product's name, read at render
// time. So a photo uploaded before the name was written is captioned too, and
// renaming the product recaptions every photo of it at the next build.
describe('product photo captions', () => {
  it('captions every photo with the product name, in alt and in the tooltip', () => {
    const { container } = renderProduct();
    const photos = [...container.querySelectorAll('img')];
    const name = productFullName(product);

    expect(photos.length).toBeGreaterThan(0);
    // Every photo on the page, the related products at the foot included —
    // those carry their own names, which is the same rule applied to them.
    for (const photo of photos) {
      expect(photo.getAttribute('alt')).toBeTruthy();
      expect(photo.getAttribute('title')).toBe(photo.getAttribute('alt'));
    }
    expect(
      photos.filter((photo) => photo.getAttribute('alt').includes(name)).length,
    ).toBeGreaterThan(0);
  });
});
