import { productDiscount } from '../data/catalog.js';

/**
 * Sale badge for the top-left corner of a product image. Salad green at
 * rest, turns red and grows slightly on hover (driven by the ancestor
 * `.group` — same pattern as the image zoom and price scale-up).
 */
export default function DiscountBadge({ product, className = '' }) {
  const { onSale, percent } = productDiscount(product);
  if (!onSale) return null;

  return (
    <span
      className={`pointer-events-none absolute left-3 top-3 z-10 rounded-xl bg-sale px-5 py-2.5 text-3xl font-bold uppercase tracking-wide text-white transition-all duration-300 group-hover:scale-110 group-hover:bg-danger ${className}`}
    >
      -{percent}%
    </span>
  );
}
