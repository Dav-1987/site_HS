// What the «Заявки» section shows: which orders under which tab, how their
// time reads, and how to reach the customer. Pure, so the counts on the tabs
// and the lists under them can't disagree.

import { ORDER_STATUSES, normalizePhone } from '../../server/order-data.js';
import { normalizeSearch } from './catalogView.js';

/** The workflow's statuses as the owner reads them, in ORDER_STATUSES order. */
export const ORDER_STATUS_LABELS = Object.freeze({
  new: 'Новая',
  called: 'Позвонили',
  confirmed: 'Подтверждена',
  delivered: 'Доставлена',
  refused: 'Отказ',
});

export const STATUS_OPTIONS = ORDER_STATUSES.map((value) => ({
  value,
  label: ORDER_STATUS_LABELS[value],
}));

// Still waiting on the owner: someone to call, an answer to wait for, a
// delivery to make.
const OPEN = new Set(['new', 'called', 'confirmed']);

/** The tabs, in order. `none` — orders from before statuses — only when there are any. */
export const ORDER_VIEWS = Object.freeze([
  { key: 'work', label: 'В работе', test: (o) => OPEN.has(o.status) },
  { key: 'new', label: 'Новые', test: (o) => o.status === 'new' },
  { key: 'called', label: 'Позвонили', test: (o) => o.status === 'called' },
  { key: 'confirmed', label: 'Подтверждены', test: (o) => o.status === 'confirmed' },
  { key: 'delivered', label: 'Доставлены', test: (o) => o.status === 'delivered' },
  { key: 'refused', label: 'Отказ', test: (o) => o.status === 'refused' },
  { key: 'none', label: 'Без статуса', test: (o) => !o.status, optional: true },
  { key: 'all', label: 'Все', test: () => true },
]);

export const DEFAULT_ORDER_VIEW = 'work';

/** «В работе» is listed by stage, the next thing to do first. */
export const WORK_GROUPS = Object.freeze([
  { status: 'new', title: 'Новые — ждут звонка' },
  { status: 'called', title: 'Позвонили — ждут решения' },
  { status: 'confirmed', title: 'Подтверждены — ждут доставки' },
]);

const digits = (s) => String(s ?? '').replace(/\D/g, '');

/**
 * True when every word of the query is in the customer's name, the product,
 * the article, the note — or, typed as digits, in the phone, however it was
 * spaced ("600 12" finds +34 600 123 456).
 */
export function matchesOrder(order, query) {
  const words = normalizeSearch(query).split(' ').filter(Boolean);
  if (!words.length) return true;
  const text = normalizeSearch(
    [order.name, order.productName, order.productId, order.note, order.postalCode].join(' '),
  );
  const phone = digits(order.phone);
  return words.every((w) => text.includes(w) || (digits(w) === w && phone.includes(w)));
}

export function ordersInView(orders, view, query = '') {
  const tab = ORDER_VIEWS.find((v) => v.key === view) ?? ORDER_VIEWS[0];
  return (orders ?? []).filter((o) => tab.test(o) && matchesOrder(o, query));
}

/** How many orders each tab holds, before the search. */
export function viewCounts(orders) {
  return Object.fromEntries(
    ORDER_VIEWS.map((v) => [v.key, (orders ?? []).filter((o) => v.test(o)).length]),
  );
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "сегодня, 12:40", "вчера, 19:20", "18 окт, 13:15", "18.10.2025, 13:15". */
export function formatOrderTime(iso, now = new Date()) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 864e5);
  if (days === 0) return `сегодня, ${time}`;
  if (days === 1) return `вчера, ${time}`;
  const date =
    d.getFullYear() === now.getFullYear()
      ? d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace(/\.$/, '')
      : d.toLocaleDateString('ru-RU');
  return `${date}, ${time}`;
}

/**
 * Where a call and a WhatsApp go. New orders store the phone in international
 * form; the ones from before the country field are Spanish, so a bare national
 * number is read as one. No WhatsApp link for a number that can't be made
 * international — wa.me needs the country code.
 */
export function contactLinks(order) {
  const international = normalizePhone(order.phone, order.country || 'ES');
  return {
    tel: `tel:${international || order.phone}`,
    whatsapp: international ? `https://wa.me/${international.replace(/^\+/, '')}` : null,
  };
}
