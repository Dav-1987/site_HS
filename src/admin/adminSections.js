// The admin's sections, in sidebar order. `path` is the URL segment under
// /admin; `short` labels the phone's strip of section links, where the full
// titles don't fit five across.
export const ADMIN_SECTIONS = Object.freeze([
  { path: 'orders', title: 'Заявки', short: 'Заявки' },
  { path: 'catalog', title: 'Каталог', short: 'Каталог' },
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

const NEW_FORMS = { one: 'новая', few: 'новые', many: 'новых', other: 'новых' };
const russianPlural = new Intl.PluralRules('ru');

/** "1 новая", "3 новые", "5 новых", "21 новая". */
export function newOrdersLabel(count) {
  return `${count} ${NEW_FORMS[russianPlural.select(count)]}`;
}
