import { isInStock, productDiscount, showsBulbsBadge } from '../data/catalog.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useProductGift } from './useProductGift.js';

/**
 * The single badge slot in the top-right corner of a product photo. It shows at
 * most one thing at a time, in this order: "Agotado" when the product is out of
 * stock, otherwise the "-N%" sale badge and — sharing the same corner — the
 * "+ bulbs de regalo" one (see BULBS below). Sold out wins because it is the
 * fact that changes what the visitor can do: a discount, or a gift, on
 * something unbuyable is noise. The bulbs also step aside for a product that
 * comes with a gift of its own, which the opposite corner is already saying.
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
const CORNER = 'pointer-events-none absolute right-[0.5em] top-[0.5em] z-10 grid';
// Every chip in the corner sits in the same single grid cell, right-aligned, so
// two of them overlap exactly instead of stacking — which is what lets one fade
// into the other in place. Each carries its own font size, because the two are
// not set at the same size and `em` padding has to follow the text it wraps.
const CELL = 'col-start-1 row-start-1 justify-self-end';
const CHIP = `${CELL} rounded-[0.4em] px-[0.667em] py-[0.333em] leading-none`;
const DISCOUNT = `${CHIP} text-[clamp(0.7rem,4.6cqw,1.25rem)] font-bold uppercase tracking-wide`;
/**
 * The bulbs are a gift, so the chip is written in the gift's language — the
 * white plate and the promo red of the "+ Estantería de regalo" chip in the
 * opposite corner — rather than in the discount's. Set a size smaller and in
 * sentence case: it carries three words where the discount carries three
 * characters, and at the discount's weight it ran the width of a mobile card.
 */
const BULBS = `${CHIP} flex items-center gap-[0.35em] bg-background/95 pl-[0.5em] text-[clamp(0.62rem,3.7cqw,1rem)] font-medium text-promo`;

/**
 * How a sold-out product's photo is rendered wherever it appears. Applied to the
 * media itself, never to its container, so the badge and the carousel arrows
 * stay at full strength on top of it.
 */
export const SOLD_OUT_MEDIA = 'grayscale opacity-60';

/** The gift itself: a filament bulb, drawn to match IconGift's line weight. */
function IconBulb({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.8.9.9 1.5l.1.6h5l.1-.6c.1-.6.4-1.1.9-1.5A6 6 0 0 0 12 3Z" />
      <path d="M9.5 19h5" />
      <path d="M10.5 21.5h3" />
    </svg>
  );
}

/**
 * The chip's own content. The "+" and the bulb are structural — the plus is the
 * same one the gift inset draws on the product photo — so only the words are a
 * translation, and only they are worth an owner's editing in /admin.
 */
function BulbsChip({ className = '' }) {
  const { t } = useLanguage();
  return (
    <span className={`${BULBS} ${className}`}>
      <span aria-hidden="true">+</span>
      <IconBulb className="h-[1.25em] w-[1.25em] shrink-0" />
      <span className="whitespace-nowrap">{t('product.bulbsBadge')}</span>
    </span>
  );
}

export default function ProductBadge({ product, className = '' }) {
  const { t } = useLanguage();
  const { badge, percent } = productDiscount(product);
  // A product given away with something bigger already says so, in the chip in
  // the opposite corner of the same photo (see GiftBadge). One gift per tile:
  // two of them is noise, and on a two-column phone grid the two chips are wide
  // enough — a little over half the photo each — to meet in the middle.
  const givesAGift = useProductGift(product) !== null;

  // Muted dark instead of the sale green: this is a state, not an offer.
  if (!isInStock(product)) {
    return (
      <span className={`${CORNER} ${className}`}>
        <span className={`${DISCOUNT} bg-primary/85 text-background`}>{t('product.soldOut')}</span>
      </span>
    );
  }

  // The discount renders when the product is on sale and the badge isn't
  // switched off for it in /admin (see showsDiscountBadge) — in which case the
  // discount is still visible as the struck-through old price next to the
  // current one. The bulbs follow their own switch (see showsBulbsBadge).
  const bulbs = showsBulbsBadge(product) && !givesAGift;
  if (!badge && !bulbs) return null;

  // One of the two, alone in the corner: nothing to swap with, so it simply
  // sits there. The discount keeps the behaviour it has always had — salad
  // green at rest, red and slightly larger on hover, driven by the ancestor
  // `.group` exactly as the image zoom and the price scale-up are.
  if (!bulbs) {
    return (
      <span className={`${CORNER} ${className}`}>
        <span
          className={`${DISCOUNT} bg-sale text-white transition-all duration-300 group-hover:scale-110 group-hover:bg-danger`}
        >
          -{percent}%
        </span>
      </span>
    );
  }
  if (!badge) {
    return (
      <span className={`${CORNER} ${className}`}>
        <BulbsChip />
      </span>
    );
  }

  // Both: the corner says one thing at a time and swaps between them. On a
  // pointer device the swap is the hover — the moment the visitor is already
  // looking at this card, and the moment the discount used to spend turning
  // red. Where there is no hover to swap on, the two take turns on a slow
  // cycle instead (three seconds each); that cycle is CSS, gated to
  // `(hover: none)` and dropped entirely for anyone who has asked for less
  // motion, in which case the corner stays on the discount. See index.css.
  return (
    <span className={`${CORNER} ${className}`}>
      <span
        className={`${DISCOUNT} badge-cycle-out bg-sale text-white transition-opacity duration-300 group-hover:opacity-0`}
      >
        -{percent}%
      </span>
      <BulbsChip className="badge-cycle-in opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </span>
  );
}
