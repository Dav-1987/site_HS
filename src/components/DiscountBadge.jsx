import { productDiscount } from '../data/catalog.js';

/**
 * Sale badge for the top-right corner of a product image. Salad green at
 * rest, turns red and grows slightly on hover (driven by the ancestor
 * `.group` — same pattern as the image zoom and price scale-up).
 *
 * Size is proportional to the image, not the viewport: the font scales with
 * the container's width (`cqw`), so a small catalog thumbnail and the large
 * product-page photo get a badge of the same relative weight. The clamp keeps
 * it legible on the narrowest 2-column mobile card and from growing past the
 * design size on the biggest photo. Padding/radius/offset are in `em` so the
 * badge keeps identical proportions at every size.
 *
 * Requires the image wrapper to carry `[container-type:inline-size]` —
 * without it `cqw` would resolve against the viewport instead.
 *
 * Renders nothing when the product isn't on sale, or when the badge is switched
 * off for it in /admin (see showsDiscountBadge) — in which case the discount is
 * still visible as the struck-through old price next to the current one.
 */
export default function DiscountBadge({ product, className = '' }) {
  const { badge, percent } = productDiscount(product);
  if (!badge) return null;

  return (
    <span
      className={`pointer-events-none absolute right-[0.5em] top-[0.5em] z-10 rounded-[0.4em] bg-sale px-[0.667em] py-[0.333em] text-[clamp(0.7rem,4.6cqw,1.25rem)] font-bold uppercase leading-none tracking-wide text-white transition-all duration-300 group-hover:scale-110 group-hover:bg-danger ${className}`}
    >
      -{percent}%
    </span>
  );
}
