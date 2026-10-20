import { isInStock } from '../../data/catalog.js';
import { MenuItem } from './OverflowMenu.jsx';

// Availability is deliberately a separate axis from visibility: a product that
// ran out keeps its listing, its page and its place in Google's index — only
// the corner badge, the photo and the order button change (see isInStock in
// src/data/catalog.js). Hiding it instead would be the visibility control's job,
// and would cost the page its internal links.

/**
 * Shown next to a collapsed row so a sold-out product is recognisable without
 * opening it. Renders nothing while the product is in stock.
 */
export function StockBadge({ product }) {
  if (isInStock(product)) return null;
  return (
    <span className="shrink-0 rounded-sm bg-primary/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.14em] text-primary/70">
      нет в наличии
    </span>
  );
}

/** Explains the state in place; renders nothing while the product is in stock. */
export function StockNote({ product }) {
  if (isInStock(product)) return null;
  return (
    <p className="mt-2 border border-primary/20 bg-surface px-3 py-2 text-xs leading-relaxed text-primary">
      Товар остаётся в каталоге, в «Избранном», в «Похожих» и в поиске Google. На фотографиях
      появляется «Agotado» вместо плашки со скидкой, само фото приглушается, кнопка заказа не
      нажимается. В товарном фиде уйдёт как «нет в наличии» — реклама по нему остановится, но
      карточка в Merchant Center сохранится.{' '}
      <span className="text-primary/75">
        На сайте видно сразу после сохранения; для поисковиков — после кнопки «Пересобрать сайт».
      </span>
    </p>
  );
}

/** Availability as a menu row, for the row menus that have no switch of their own. */
export function StockMenuItem({ product, onChange }) {
  const inStock = isInStock(product);
  return (
    <MenuItem checked={!inStock} onClick={() => onChange(!inStock)}>
      Нет в наличии
    </MenuItem>
  );
}
