import { describe, it, expect } from 'vitest';
import { validateOrder, formatOrderText } from './order.js';

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
