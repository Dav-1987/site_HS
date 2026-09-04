// Как хранится подарок (см. normalizeGift в server/store.js, productGift в
// src/data/catalog.js) и какому ответу в редакторе это соответствует:
//
//   inherit → {}                                            только у товара
//   catalog → { mode:'own', source:'catalog', productId }    у категории mode не пишется
//   custom  → { mode:'own', source:'custom', name, size, image }
//   off     → { mode:'off' }                                 только у товара
//
// У категории режима нет: она сама и есть правило, поэтому её «нет подарка» —
// просто пустой объект.
//
// Живёт отдельным файлом, а не в GiftEditor.jsx: то же самое читает подпись к
// свёрнутой группе (src/admin/hints.js), а компонентный файл должен
// экспортировать только компоненты — иначе ломается hot reload.

/** Какой из вариантов редактора описывает сохранённый объект. */
export function giftChoice(gift, forProduct) {
  const g = gift ?? {};
  if (forProduct) {
    if (g.mode === 'off') return 'off';
    if (g.mode !== 'own') return 'inherit';
  } else if (!g.source) {
    return 'none';
  }
  return g.source === 'custom' ? 'custom' : 'catalog';
}
