import { describe, expect, it } from 'vitest';
import {
  STATUS_OPTIONS,
  contactLinks,
  matchesOrder,
  ordersInView,
  viewCounts,
} from './orderView.js';

const order = (id, extra = {}) => ({
  id,
  name: 'Ana García',
  phone: '+34600123456',
  country: 'ES',
  productName: 'Tocador Doble Cajonera',
  productId: 'Tocador-L-06',
  note: '',
  status: 'new',
  ...extra,
});

const ORDERS = [
  order(1),
  order(2, { status: 'called' }),
  order(3, { status: 'confirmed' }),
  order(4, { status: 'delivered' }),
  order(5, { status: 'refused' }),
  order(6, { status: null }),
];
const ids = (list) => list.map((o) => o.id);

describe('views', () => {
  it('keeps «В работе» to what still needs the owner', () => {
    expect(ids(ordersInView(ORDERS, 'work'))).toEqual([1, 2, 3]);
  });

  it('has a tab per status, the old ones without a status, and all', () => {
    expect(ids(ordersInView(ORDERS, 'delivered'))).toEqual([4]);
    expect(ids(ordersInView(ORDERS, 'none'))).toEqual([6]);
    expect(ids(ordersInView(ORDERS, 'all'))).toHaveLength(6);
  });

  it('falls back to «В работе» for a tab it does not know', () => {
    expect(ids(ordersInView(ORDERS, 'nope'))).toEqual([1, 2, 3]);
  });

  it('counts every tab', () => {
    expect(viewCounts(ORDERS)).toEqual({
      work: 3,
      new: 1,
      called: 1,
      confirmed: 1,
      delivered: 1,
      refused: 1,
      none: 1,
      all: 6,
    });
  });

  it('offers the statuses in workflow order, in Russian', () => {
    expect(STATUS_OPTIONS.map((o) => o.label)).toEqual([
      'Новая',
      'Позвонили',
      'Подтверждена',
      'Доставлена',
      'Отказ',
    ]);
  });
});

describe('search', () => {
  it('finds by name, product, article or note, ignoring accents', () => {
    expect(matchesOrder(order(1), 'garcia')).toBe(true);
    expect(matchesOrder(order(1), 'doble cajonera')).toBe(true);
    expect(matchesOrder(order(1), 'l-06')).toBe(true);
    expect(matchesOrder(order(1, { note: 'Perezvonit v 18' }), '18')).toBe(true);
    expect(matchesOrder(order(1), 'nogal')).toBe(false);
  });

  it('finds a phone however it is spaced', () => {
    expect(matchesOrder(order(1), '600 123')).toBe(true);
    expect(matchesOrder(order(1, { phone: '600 12 34 56' }), '6001234')).toBe(true);
    expect(matchesOrder(order(1), '999')).toBe(false);
  });
});

describe('contactLinks', () => {
  it('calls and writes to the international number', () => {
    expect(contactLinks(order(1))).toEqual({
      tel: 'tel:+34600123456',
      whatsapp: 'https://wa.me/34600123456',
    });
  });

  it('reads a bare number from before the country field as Spanish', () => {
    expect(contactLinks(order(1, { phone: '600 12 34 56', country: null })).whatsapp).toBe(
      'https://wa.me/34600123456',
    );
  });

  it('has no WhatsApp for a number it cannot make international', () => {
    const links = contactLinks(order(1, { phone: '12', country: null }));
    expect(links.whatsapp).toBeNull();
    expect(links.tel).toBe('tel:12');
  });
});
