import { describe, it, expect } from 'vitest';
import { validateOrder, resolveOrderItems, formatOrderText } from './order.js';

const catalog = [
  {
    slug: 'tocadores',
    name: { es: 'Tocadores', en: 'Vanities' },
    products: [
      { id: 'p1', name: 'Aria', price: 450 },
      { id: 'p2', name: 'Luna', price: 300 },
    ],
  },
];

const validBody = {
  name: 'Ana',
  phone: '+34 600 000 000',
  email: '',
  comment: '',
  items: [{ id: 'p1', qty: 2 }],
};

describe('validateOrder', () => {
  it('accepts a valid payload', () => {
    expect(validateOrder(validBody)).toBeNull();
  });

  it('requires name and phone', () => {
    expect(validateOrder({ ...validBody, name: '  ' })).toMatch(/name/);
    expect(validateOrder({ ...validBody, phone: '' })).toMatch(/phone/);
  });

  it('rejects malformed email but allows it empty', () => {
    expect(validateOrder({ ...validBody, email: 'not-an-email' })).toMatch(/email/);
    expect(validateOrder({ ...validBody, email: 'ana@example.com' })).toBeNull();
  });

  it('rejects an empty or oversized cart', () => {
    expect(validateOrder({ ...validBody, items: [] })).toMatch(/empty/);
    const tooMany = Array.from({ length: 51 }, (_, i) => ({ id: `p${i}`, qty: 1 }));
    expect(validateOrder({ ...validBody, items: tooMany })).toMatch(/too many/);
  });

  it('rejects bad item ids and quantities', () => {
    expect(validateOrder({ ...validBody, items: [{ id: 42, qty: 1 }] })).toMatch(/item id/);
    expect(validateOrder({ ...validBody, items: [{ id: 'p1', qty: 0 }] })).toMatch(/quantity/);
    expect(validateOrder({ ...validBody, items: [{ id: 'p1', qty: 1.5 }] })).toMatch(/quantity/);
    expect(validateOrder({ ...validBody, items: [{ id: 'p1', qty: 100 }] })).toMatch(/quantity/);
  });

  it('rejects non-object payloads', () => {
    expect(validateOrder(null)).toBeTruthy();
    expect(validateOrder('x')).toBeTruthy();
  });
});

describe('resolveOrderItems', () => {
  it('takes names and prices from the catalog, not the client', () => {
    const lines = resolveOrderItems([{ id: 'p1', qty: 2, price: 1 }], catalog);
    expect(lines).toEqual([
      { id: 'p1', qty: 2, name: 'Aria', category: 'Tocadores', price: 450, total: 900 },
    ]);
  });

  it('skips ids that are not in the catalog', () => {
    const lines = resolveOrderItems(
      [
        { id: 'ghost', qty: 1 },
        { id: 'p2', qty: 1 },
      ],
      catalog,
    );
    expect(lines.map((l) => l.id)).toEqual(['p2']);
  });
});

describe('formatOrderText', () => {
  it('renders customer, lines and total; omits empty optional fields', () => {
    const lines = resolveOrderItems(
      [
        { id: 'p1', qty: 2 },
        { id: 'p2', qty: 1 },
      ],
      catalog,
    );
    const text = formatOrderText(
      { name: ' Ana ', phone: '+34 600 000 000', email: '', comment: '' },
      lines,
    );
    expect(text).toContain('Cliente: Ana');
    expect(text).toContain('Teléfono: +34 600 000 000');
    expect(text).not.toContain('Email:');
    expect(text).not.toContain('Comentario:');
    expect(text).toContain('1. Aria (Tocadores) — 2 × 450 € = 900 €');
    expect(text).toContain('Total: 1200 €');
  });

  it('includes email and comment when present', () => {
    const text = formatOrderText(
      { name: 'Ana', phone: '600', email: 'ana@example.com', comment: 'Urgente' },
      resolveOrderItems([{ id: 'p1', qty: 1 }], catalog),
    );
    expect(text).toContain('Email: ana@example.com');
    expect(text).toContain('Comentario: Urgente');
  });
});
