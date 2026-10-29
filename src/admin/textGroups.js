// The site's texts as the «Тексты сайта» screen lists them: grouped by the
// first part of the key ("order.form.name" → order), each group under a
// Russian name, in the order a visitor meets them on the site. A group missing
// here would show its bare key prefix ("order", "a11y") — textGroups.test.js
// fails the build for that.
export const TEXT_GROUPS = Object.freeze([
  { prefix: 'nav', title: 'Меню' },
  { prefix: 'hero', title: 'Главный экран' },
  { prefix: 'section', title: 'Секции главной' },
  { prefix: 'home', title: 'SEO главной страницы (заголовок вкладки, Google, превью)' },
  { prefix: 'catalog', title: 'Страница каталога' },
  { prefix: 'category', title: 'Категория' },
  { prefix: 'product', title: 'Карточка товара' },
  { prefix: 'order', title: 'Заявка: кнопка «Заказать» и форма' },
  { prefix: 'reviews', title: 'Отзывы' },
  { prefix: 'guides', title: 'Раздел «Guías»: подписи страниц статей' },
  { prefix: 'contact', title: 'Контакты' },
  { prefix: 'shipping', title: 'Страница «Доставка»' },
  { prefix: 'returns', title: 'Страница «Возврат»' },
  { prefix: 'policy', title: 'Доставка и возврат: строка с контактами' },
  { prefix: 'privacy', title: 'Политика конфиденциальности' },
  { prefix: 'legal', title: 'Правовая информация (Aviso legal)' },
  { prefix: 'cookie', title: 'Баннер cookie' },
  { prefix: 'footer', title: 'Подвал' },
  { prefix: 'notFound', title: 'Страница 404' },
  { prefix: 'error', title: 'Сообщение о сбое на сайте' },
  { prefix: 'lightbox', title: 'Просмотр фото на весь экран' },
  { prefix: 'carousel', title: 'Карусели: подписи для экранного диктора' },
  { prefix: 'a11y', title: 'Ссылка «к содержимому» для экранного диктора' },
  { prefix: 'common', title: 'Общее' },
]);

const prefixOf = (key) => key.split('.')[0];

/**
 * `keys` sorted into `{ prefix, title, keys }` groups, in TEXT_GROUPS order.
 * A prefix without a name still gets its group, after the named ones, so a new
 * text is never left out of the screen.
 */
export function groupTexts(keys) {
  const byPrefix = new Map();
  for (const key of keys) {
    const prefix = prefixOf(key);
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
    byPrefix.get(prefix).push(key);
  }
  const named = TEXT_GROUPS.filter((g) => byPrefix.has(g.prefix)).map((g) => ({
    ...g,
    keys: byPrefix.get(g.prefix),
  }));
  const known = new Set(TEXT_GROUPS.map((g) => g.prefix));
  const unnamed = [...byPrefix]
    .filter(([prefix]) => !known.has(prefix))
    .map(([prefix, groupKeys]) => ({ prefix, title: prefix, keys: groupKeys }));
  return [...named, ...unnamed];
}
