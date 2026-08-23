import { isInStock } from '../../data/catalog.js';

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
    <p className="mt-2 border-l-2 border-primary/30 bg-primary/5 px-3 py-2 text-xs leading-relaxed text-primary/80">
      Товар остаётся в каталоге, в «Избранном», в «Похожих» и в поиске Google. На фотографиях
      появляется «Agotado» вместо плашки со скидкой, само фото приглушается, кнопка заказа не
      нажимается. В товарном фиде уйдёт как «нет в наличии» — реклама по нему остановится, но
      карточка в Merchant Center сохранится.{' '}
      <span className="text-primary/50">
        На сайте видно сразу после сохранения; для поисковиков — после кнопки «Пересобрать сайт».
      </span>
    </p>
  );
}

/**
 * Availability switch, sized to sit inside a collapsed product row next to
 * VisibilitySelect so stock can be flipped without expanding the product.
 */
export default function StockToggle({ product, onChange }) {
  const inStock = isInStock(product);
  return (
    <button
      type="button"
      onClick={() => onChange(!inStock)}
      title={inStock ? 'Товар в наличии — нажмите, чтобы отметить «нет в наличии»' : 'Нет в наличии — нажмите, чтобы вернуть в наличие'}
      aria-pressed={!inStock}
      className={`shrink-0 border px-2 py-1.5 text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-accent ${
        inStock
          ? 'border-primary/15 bg-background text-primary/60 hover:text-primary'
          : 'border-primary/40 bg-primary/5 text-primary'
      }`}
    >
      {inStock ? 'В наличии' : 'Нет в наличии'}
    </button>
  );
}
