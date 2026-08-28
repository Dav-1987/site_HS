import { describe, it, expect } from 'vitest';
import { validateOrder, formatOrderText, isValidPhone, resolveOrderProduct } from './order.js';

const validBody = {
  name: 'Ana',
  phone: '+34 600 000 000',
  country: 'ES',
  postalCode: '28001',
  comment: '',
  productId: 'p1',
  eventId: '86e127af-27e6-4a49-82a5-3af82e19ed25',
};

describe('validateOrder', () => {
  it('accepts a valid payload', () => {
    expect(validateOrder(validBody)).toBeNull();
  });

  it('requires name, country, phone and postal code', () => {
    expect(validateOrder({ ...validBody, name: '  ' })).toMatch(/name/);
    expect(validateOrder({ ...validBody, country: '' })).toMatch(/country/);
    expect(validateOrder({ ...validBody, phone: '' })).toMatch(/phone/);
    expect(validateOrder({ ...validBody, postalCode: '  ' })).toMatch(/postalCode/);
    expect(validateOrder({ ...validBody, postalCode: undefined })).toMatch(/postalCode/);
  });

  it('accepts only approved ISO delivery countries', () => {
    expect(validateOrder({ ...validBody, country: 'FR', phone: '06 12 34 56 78' })).toBeNull();
    expect(validateOrder({ ...validBody, country: 'PT', phone: '912 345 678' })).toBeNull();
    expect(validateOrder({ ...validBody, country: 'FRA' })).toMatch(/ISO/);
    expect(validateOrder({ ...validBody, country: 'DE' })).toMatch(/not available/);
  });

  it('allows an explicit Armenian phone for delivery in France', () => {
    expect(validateOrder({ ...validBody, country: 'FR', phone: '+374 99 123456' })).toBeNull();
  });

  it('rejects a malformed postal code', () => {
    expect(validateOrder({ ...validBody, postalCode: '!!' })).toMatch(/postalCode/);
    expect(validateOrder({ ...validBody, postalCode: '2' })).toMatch(/postalCode/);
    expect(validateOrder({ ...validBody, postalCode: '1'.repeat(21) })).toMatch(/postalCode/);
    expect(validateOrder({ ...validBody, postalCode: 'SW1A 1AA' })).toBeNull();
  });

  it('requires a product id and a stable event id', () => {
    expect(validateOrder({ ...validBody, productId: '' })).toMatch(/productId/);
    expect(validateOrder({ ...validBody, eventId: '' })).toMatch(/eventId/);
    expect(validateOrder({ ...validBody, eventId: 'contains spaces' })).toMatch(/eventId/);
  });

  it('rejects oversized fields', () => {
    expect(validateOrder({ ...validBody, name: 'a'.repeat(201) })).toMatch(/name/);
    expect(validateOrder({ ...validBody, phone: '1'.repeat(51) })).toMatch(/phone/);
    expect(validateOrder({ ...validBody, address: 'x'.repeat(301) })).toMatch(/address/);
    expect(validateOrder({ ...validBody, comment: 'x'.repeat(2001) })).toMatch(/comment/);
  });

  it('accepts an omitted address', () => {
    expect(validateOrder(validBody)).toBeNull();
    expect(validateOrder({ ...validBody, address: 'Calle Falsa 123, Madrid' })).toBeNull();
  });

  it('accepts an omitted attribution but rejects a non-object one', () => {
    expect(validateOrder({ ...validBody, attribution: undefined })).toBeNull();
    expect(validateOrder({ ...validBody, attribution: null })).toBeNull();
    expect(validateOrder({ ...validBody, attribution: { utm_source: 'ig' } })).toBeNull();
    expect(validateOrder({ ...validBody, attribution: 'ig' })).toMatch(/attribution/);
    expect(validateOrder({ ...validBody, attribution: ['ig'] })).toMatch(/attribution/);
  });

  it('rejects non-object payloads', () => {
    expect(validateOrder(null)).toBeTruthy();
    expect(validateOrder('x')).toBeTruthy();
  });

  it('rejects a malformed phone number', () => {
    expect(validateOrder({ ...validBody, phone: 'abc' })).toMatch(/phone/);
    expect(validateOrder({ ...validBody, phone: '12' })).toMatch(/phone/);
    expect(validateOrder({ ...validBody, phone: '600-000-OOPS' })).toMatch(/phone/);
  });

  it('does not trust or validate client-supplied product labels and prices', () => {
    expect(validateOrder(validBody)).toBeNull();
    expect(validateOrder({ ...validBody, productName: 'Forged', price: -1 })).toBeNull();
  });
});

describe('resolveOrderProduct', () => {
  const catalog = [
    {
      slug: 'tocadores',
      products: [{ id: 'p1', name: 'Tocador Aria', subtitle: 'Pro', price: 450 }],
    },
  ];

  it('derives the label and price from the live server catalog', () => {
    expect(resolveOrderProduct(catalog, 'p1')).toEqual({
      productId: 'p1',
      productName: 'Tocador Aria Pro',
      price: 450,
    });
  });

  it('returns null for an unknown product id', () => {
    expect(resolveOrderProduct(catalog, 'missing')).toBeNull();
  });
});

describe('isValidPhone', () => {
  it('accepts real-looking numbers in various formats', () => {
    expect(isValidPhone('+34 600 000 000', 'ES')).toBe(true);
    expect(isValidPhone('600000000', 'ES')).toBe(true);
    expect(isValidPhone('06 12 34 56 78', 'FR')).toBe(true);
    expect(isValidPhone('+374 99 123456', 'FR')).toBe(true);
  });

  it('rejects garbage, too-short, and too-long input', () => {
    expect(isValidPhone('abc', 'ES')).toBe(false);
    expect(isValidPhone('12', 'ES')).toBe(false);
    expect(isValidPhone('1'.repeat(20), 'ES')).toBe(false);
    expect(isValidPhone('', 'ES')).toBe(false);
    expect(isValidPhone(undefined, 'ES')).toBe(false);
    expect(isValidPhone('600000000', undefined)).toBe(false);
  });
});

describe('formatOrderText', () => {
  it('renders customer and product; omits empty optional fields', () => {
    const text = formatOrderText({
      name: ' Ana ',
      phone: '+34 600 000 000',
      comment: '',
      productName: 'Tocador Aria',
      productId: 'p1',
    });
    expect(text).toContain('Cliente: Ana');
    expect(text).toContain('Teléfono: +34 600 000 000');
    expect(text).toContain('Producto: Tocador Aria [p1]');
    expect(text).not.toContain('Comentarios:');
  });

  it('includes comment when present', () => {
    const text = formatOrderText({
      name: 'Ana',
      phone: '600',
      comment: 'Urgente',
      productName: 'Tocador Aria',
    });
    expect(text).toContain('Comentarios: Urgente');
  });

  it('omits productId bracket when id is not provided', () => {
    const text = formatOrderText({ name: 'Ana', phone: '600', productName: 'Tocador Aria' });
    expect(text).not.toContain('[');
  });

  it('includes the current price, not any struck-through one', () => {
    const text = formatOrderText({
      name: 'Ana',
      phone: '600',
      productName: 'Tocador Aria',
      price: 450,
    });
    expect(text).toContain('Precio: 450 €');
  });

  it('omits the price line when not provided', () => {
    const text = formatOrderText({ name: 'Ana', phone: '600', productName: 'Tocador Aria' });
    expect(text).not.toContain('Precio');
  });

  it('includes address when present, omits it otherwise', () => {
    const withAddress = formatOrderText({
      name: 'Ana',
      phone: '600',
      address: 'Calle Falsa 123, Madrid',
      productName: 'Tocador Aria',
    });
    expect(withAddress).toContain('Dirección: Calle Falsa 123, Madrid');

    const withoutAddress = formatOrderText({
      name: 'Ana',
      phone: '600',
      productName: 'Tocador Aria',
    });
    expect(withoutAddress).not.toContain('Dirección');
  });

  it('always names the traffic source, falling back to direct', () => {
    const fromAd = formatOrderText({
      name: 'Ana',
      phone: '600',
      productName: 'Tocador Aria',
      attribution: { network: 'meta_ads', utm_source: 'ig', utm_campaign: 'agosto' },
    });
    expect(fromAd).toContain('Fuente: Meta Ads · Instagram — «agosto»');

    const unknown = formatOrderText({ name: 'Ana', phone: '600', productName: 'Tocador Aria' });
    expect(unknown).toContain('Fuente: Directo / desconocido');
  });

  it('includes the postal code when present', () => {
    const text = formatOrderText({
      name: 'Ana',
      phone: '600',
      postalCode: '28001',
      productName: 'Tocador Aria',
    });
    expect(text).toContain('Código Postal: 28001');
  });

  it('includes the localized delivery country when present', () => {
    const text = formatOrderText({
      name: 'Ana',
      phone: '+37499123456',
      country: 'FR',
      productName: 'Tocador Aria',
    });
    expect(text).toContain('País: Francia (FR)');
  });
});
