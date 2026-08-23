import { productDiscount, isInStock } from '../data/catalog.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';

/**
 * The single badge slot in the top-right corner of a product photo. It shows at
 * most one thing, in this order: "Agotado" when the product is out of stock,
 * otherwise the "-N%" sale badge. Sold out wins because it is the fact that
 * changes what the visitor can do — a discount on something unbuyable is noise.
 *
 * Size is proportional to the image, not the viewport: the font scales with the
 * container's width (`cqw`), so a small catalog thumbnail and the large product
 * page photo get a badge of the same relative weight. The clamp keeps it legible
 * on the narrowest 2-column mobile card and from growing past the design size on
 * the biggest photo. Padding/radius/offset are in `em` so the badge keeps
 * identical proportions at every size.
 *
 * Requires the image wrapper to carry `[container-type:inline-size]` — without
 * it `cqw` would resolve against the viewport instead.
 */
const SLOT =
  'pointer-events-none absolute right-[0.5em] top-[0.5em] z-10 rounded-[0.4em] px-[0.667em] py-[0.333em] text-[clamp(0.7rem,4.6cqw,1.25rem)] font-bold uppercase leading-none tracking-wide';

/**
 * How a sold-out product's photo is rendered wherever it appears. Applied to the
 * media itself, never to its container, so the badge and the carousel arrows
 * stay at full strength on top of it.
 */
export const SOLD_OUT_MEDIA = 'grayscale opacity-60';

export default function ProductBadge({ product, className = '' }) {
  const { t } = useLanguage();
  const { badge, percent } = productDiscount(product);

  // Muted dark instead of the sale green: this is a state, not an offer.
  if (!isInStock(product)) {
    return (
      <span className={`${SLOT} bg-primary/85 text-background ${className}`}>
        {t('product.soldOut')}
      </span>
    );
  }

  // Salad green at rest, turns red and grows slightly on hover (driven by the
  // ancestor `.group` — same pattern as the image zoom and price scale-up).
  // Renders nothing when the product isn't on sale, or when the badge is
  // switched off for it in /admin (see showsDiscountBadge) — in which case the
  // discount is still visible as the struck-through old price next to the
  // current one.
  if (!badge) return null;

  return (
    <span
      className={`${SLOT} bg-sale text-white transition-all duration-300 group-hover:scale-110 group-hover:bg-danger ${className}`}
    >
      -{percent}%
    </span>
  );
}
