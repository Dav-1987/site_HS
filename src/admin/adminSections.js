import { countLabel } from './plural.js';

// The admin's sections, in sidebar order. `path` is the URL segment under
// /admin; `short` labels the phone's strip of section links, where the full
// titles don't fit five across. `wide` sections use the whole window rather
// than a reading-width column — the catalog sets its list and a product side
// by side, and an order is a row of five columns.
export const ADMIN_SECTIONS = Object.freeze([
  { path: 'orders', title: 'Заявки', short: 'Заявки', wide: true },
  { path: 'catalog', title: 'Каталог', short: 'Каталог', wide: true },
  { path: 'home', title: 'Главная страница', short: 'Главная' },
  { path: 'texts', title: 'Тексты сайта', short: 'Тексты' },
  { path: 'settings', title: 'Настройки', short: 'Настройки' },
]);

/** Where /admin itself, and any address it does not know, leads. */
export const DEFAULT_SECTION = 'catalog';

/** The section a pathname is in (`/admin/catalog/…` → catalog), or null. */
export function sectionFor(pathname) {
  const segment = pathname.split('/')[2] ?? '';
  return ADMIN_SECTIONS.find((s) => s.path === segment) ?? null;
}

/** "1 новая", "3 новые", "5 новых", "21 новая". */
export function newOrdersLabel(count) {
  return countLabel(count, ['новая', 'новые', 'новых']);
}
