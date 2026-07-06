import { describe, it, expect } from 'vitest';
import { validateOrder, formatOrderText, isValidPhone } from './order.js';

const validBody = {
  name: 'Ana',
  phone: '+34 600 000 000',
  comment: '',
  productName: 'Tocador Aria',
};

describe('validateOrder', () => {
  it('accepts a valid payload', () => {
    expect(validateOrder(validBody)).toBeNull();
  });

  it('requires name and phone', () => {
    expect(validateOrder({ ...validBody, name: '  ' })).toMatch(/name/);
    expect(validateOrder({ ...validBody, phone: '' })).toMatch(/phone/);
  });

  it('requires productName', () => {
    expect(validateOrder({ ...validBody, productName: '' })).toMatch(/productName/);
    expect(validateOrder({ ...validBody, productName: '   ' })).toMatch(/productName/);
  });

  it('rejects oversized fields', () => {
    expect(validateOrder({ ...validBody, name: 'a'.repeat(201) })).toMatch(/name/);
    expect(validateOrder({ ...validBody, phone: '1'.repeat(51) })).toMatch(/phone/);
    expect(validateOrder({ ...validBody, comment: 'x'.repeat(2001) })).toMatch(/comment/);
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
});

describe('isValidPhone', () => {
  it('accepts real-looking numbers in various formats', () => {
    expect(isValidPhone('+34 600 000 000')).toBe(true);
    expect(isValidPhone('600000000')).toBe(true);
    expect(isValidPhone('(600) 000-000')).toBe(true);
  });

  it('rejects garbage, too-short, and too-long input', () => {
    expect(isValidPhone('abc')).toBe(false);
    expect(isValidPhone('12')).toBe(false);
    expect(isValidPhone('1'.repeat(20))).toBe(false);
    expect(isValidPhone('')).toBe(false);
    expect(isValidPhone(undefined)).toBe(false);
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
});
