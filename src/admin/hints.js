import { giftChoice } from './gift.js';
import { giftQty } from '../data/catalog.js';

// Подписи справа от заголовков свёрнутых групп (см. Section.jsx): короткая
// сводка того, ради чего группу обычно и открывают. Живут отдельно от самих
// редакторов, потому что карточка товара и карточка категории показывают одни
// и те же сводки для одних и тех же полей.

/** Заполненность двуязычного поля одной строкой: «ES · EN», «ES», «—». */
export const langHint = (pair) =>
  [pair?.es && 'ES', pair?.en && 'EN'].filter(Boolean).join(' · ') || '—';

// Ровно те же пять ответов, что и в выпадающем списке GiftEditor — только
// строчными и покороче, чтобы уместиться в строку заголовка.
const GIFT_HINTS = {
  inherit: 'как у категории',
  none: 'нет',
  catalog: 'товар из каталога',
  custom: 'свой',
  off: 'без подарка',
};

/**
 * Что стоит в подарке, теми же словами, что и в самом редакторе подарка, плюс
 * количество — но только там, где подарок вообще задан: у «как у категории» и
 * «без подарка» своего количества нет, и оставшееся от прошлой правки число в
 * заголовке читалось бы как обещание.
 */
export const giftHint = (gift, forProduct) => {
  const choice = giftChoice(gift, forProduct);
  const qty = giftQty(gift);
  const own = choice === 'catalog' || choice === 'custom';
  return own && qty > 1 ? `${GIFT_HINTS[choice]} × ${qty}` : GIFT_HINTS[choice];
};

/** Список непустых значений через « · », или «—» когда пусто. */
export const listHint = (...values) => values.filter(Boolean).join(' · ') || '—';
