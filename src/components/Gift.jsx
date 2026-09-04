import { Link } from './LocalizedLink.jsx';
import Media from './Media.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useOptionalCatalog } from '../catalog/CatalogContext.jsx';
import { findProduct, isInStock, productGift } from '../data/catalog.js';

/**
 * The three faces of a gift with purchase, in one file because they are three
 * views of a single fact and are meant to change together:
 *
 *   GiftLine   the sentence under the price — the one that has to be read
 *   GiftInset  the corner of the product photo — the one that is seen first
 *   GiftBadge  the corner of a catalog tile — the one that brings people in
 *
 * All three take the resolved offer from productGift() (see src/data/catalog.js),
 * which is what decides whether there is anything to show at all. Each renders
 * nothing when there isn't, so callers never have to ask first.
 */

function IconGift({ className = '' }) {
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
      <rect x="3" y="9" width="18" height="12" rx="1" />
      <path d="M3 13h18" />
      <path d="M12 9v12" />
      <path d="M12 9C10.5 6 9 3.5 7 4.2 5.4 4.8 5.6 7.4 8 8.4c1.3.5 2.7.6 4 .6z" />
      <path d="M12 9c1.5-3 3-5.5 5-4.8 1.6.6 1.4 3.2-1 4.2-1.3.5-2.7.6-4 .6z" />
    </svg>
  );
}

/**
 * "Incluye Estantería 60 × 180 cm de regalo (valor 89 €)".
 *
 * Built from a prefix and a suffix around the name rather than one translated
 * sentence: Spanish and English do not put the gift's name in the same place,
 * and only the name is a link. Nothing is a link for a gift the shop does not
 * sell as a product — it has no page to open.
 *
 * `linked={false}` drops the link where following it would be the wrong move:
 * inside the order form it would carry someone out of a half-filled form, and
 * it would join the dialog's focus trap on the way.
 */
export function GiftLine({ gift, linked = true, className = '' }) {
  const { t } = useLanguage();
  if (!gift) return null;
  const after = t('product.giftAfter');

  return (
    <p className={`flex items-start gap-2 text-sm text-promo ${className}`}>
      <IconGift className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        {t('product.giftBefore')}{' '}
        {linked && gift.href ? (
          <Link
            to={gift.href}
            className="underline underline-offset-[3px] transition-opacity duration-300 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-promo"
          >
            {gift.name}
          </Link>
        ) : (
          gift.name
        )}
        {after ? ` ${after}` : ''}
        {gift.price ? (
          <span className="text-secondary">
            {' '}
            ({t('product.giftValue')} {gift.price} {t('common.currency')})
          </span>
        ) : null}
      </span>
    </p>
  );
}

/**
 * The gift on the product's own photo: a thumbnail of it in the bottom-left
 * corner, behind a "+".
 *
 * Bottom-left is the one corner nothing else claims — the sale/sold-out badge
 * owns the top-right, the zoom hint the bottom-right, and a catalog tile's
 * carousel dots the bottom-centre. It sizes itself against the photo rather
 * than the viewport (`cqw`, as ProductBadge does), so it keeps the same
 * proportions on a thumbnail and on the full-width product photo; the photo's
 * wrapper must carry `[container-type:inline-size]` for that to resolve.
 *
 * `atTop` moves it to the opposite corner for a video, where the bottom edge
 * belongs to the browser's own control bar — the inset does not take clicks,
 * but sitting over the play button it would still read as covering it.
 *
 * Skipped when the gift has no photo of its own — an empty frame promises
 * nothing, and the line under the price still says what is included.
 */
export function GiftInset({ gift, atTop = false, className = '' }) {
  const { t } = useLanguage();
  if (!gift?.image) return null;

  return (
    <div
      className={`pointer-events-none absolute ${
        atTop ? 'top-[0.5em]' : 'bottom-[0.5em]'
      } left-[0.5em] z-10 flex items-center gap-[0.5em] border border-accent/60 bg-background/95 p-[0.3em] pr-[0.7em] text-[clamp(0.7rem,4.6cqw,1.25rem)] ${className}`}
    >
      <span className="flex h-[1.5em] w-[1.5em] shrink-0 items-center justify-center rounded-full bg-accent-text text-[0.9em] leading-none text-background">
        +
      </span>
      <span className="h-[3em] w-[2.4em] shrink-0 overflow-hidden bg-surface">
        <Media id={gift.image} alt="" w={300} />
      </span>
      <span className="min-w-0">
        <span className="block text-[0.55em] uppercase leading-none tracking-[0.2em] text-accent-text">
          {t('product.giftLabel')}
        </span>
        <span className="mt-[0.35em] block truncate font-serif text-[0.85em] font-light leading-tight text-primary">
          {gift.shortName || gift.name}
        </span>
      </span>
    </div>
  );
}

/**
 * The other side of the offer, on the gift's own page: "De regalo con Tocador
 * blanco 120 × 40 cm" — so nobody pays for a piece they were about to be given.
 * Takes what giftedWith() resolved (see src/data/catalog.js); renders nothing
 * when the product is not given away with anything.
 */
export function GiftWithNote({ offer, className = '' }) {
  const { t } = useLanguage();
  if (!offer) return null;

  return (
    <p className={`flex items-start gap-2 text-sm text-promo ${className}`}>
      <IconGift className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        {t('product.giftWith')}{' '}
        <Link
          to={offer.href}
          className="underline underline-offset-[3px] transition-opacity duration-300 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-promo"
        >
          {offer.name}
        </Link>
      </span>
    </p>
  );
}

/**
 * The gift on a catalog tile: a small chip in the top-left corner, opposite the
 * sale badge. The tile has no room for the inset above — at two columns on a
 * phone its photo would be unreadable — so it says only that there is one.
 *
 * Resolves the offer itself from the catalog, so a card only has to render it:
 * every grid on the site builds its tiles from a bare product, and threading
 * the gift down through each of them would be the same lookup written five
 * times. Sold out wins over it for the same reason it wins over the discount —
 * a gift with something unbuyable is noise.
 */
export function GiftBadge({ product, className = '' }) {
  const { lang, t } = useLanguage();
  // Optional on purpose: a tile is rendered in a dozen places, and a chip in
  // its corner is not worth taking one of them down over.
  const allCategories = useOptionalCatalog()?.allCategories ?? [];
  const found = findProduct(allCategories, product?.id);
  if (!found || !isInStock(found.product)) return null;
  const gift = productGift(allCategories, found.product, found.category, lang);
  if (!gift) return null;

  return (
    <span
      className={`pointer-events-none absolute left-[0.5em] top-[0.5em] z-10 flex items-center gap-[0.35em] rounded-[0.4em] bg-background/95 px-[0.5em] py-[0.3em] text-[clamp(0.65rem,4cqw,1.1rem)] font-medium uppercase leading-none tracking-wide text-promo ${className}`}
    >
      <IconGift className="h-[1.1em] w-[1.1em]" />
      {t('product.giftBadge')}
    </span>
  );
}
