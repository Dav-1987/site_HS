import { Link } from './LocalizedLink.jsx';
import Media from './Media.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useProductGift } from './useProductGift.js';

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

/** The gift mark itself. Exported because the navigation menu carries it too. */
export function IconGift({ className = '' }) {
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
 *
 * `compact` is for the order dialog, where every line costs: the value in
 * brackets wrapped the sentence onto a second line and pushed the submit button
 * off the bottom of the screen. The value is an argument for buying, and by the
 * time the form is open it has already been made on the product page — what is
 * left to say here is only that the gift comes with this order.
 *
 * On the product page it is set larger and bold and pulses twice as it arrives:
 * it is the one line on the page carrying something the price alone does not
 * say. The compact one does neither — it sits above a form the visitor is about
 * to fill in, and movement next to a text field is a distraction rather than an
 * announcement. The pulse scales from the left edge so the sentence grows away
 * from the price it sits under instead of drifting across it, and it stops
 * altogether for anyone who has asked for less motion (see index.css).
 */
export function GiftLine({ gift, linked = true, compact = false, className = '' }) {
  const { t } = useLanguage();
  if (!gift) return null;
  const after = t('product.giftAfter');

  return (
    <p
      className={`flex items-start gap-2 text-promo ${
        compact ? 'text-xs' : 'origin-left animate-gift-pulse text-base font-bold'
      } ${className}`}
    >
      <IconGift className={`mt-0.5 shrink-0 ${compact ? 'h-3.5 w-3.5' : 'h-5 w-5'}`} />
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
        {!compact && gift.price ? (
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
      } left-[0.5em] z-10 flex origin-left animate-gift-pulse items-center gap-[0.5em] border border-accent/60 bg-background/95 p-[0.3em] pr-[0.7em] text-[clamp(0.85rem,5.8cqw,1.6rem)] ${className}`}
    >
      {/* The sale green, the same one the "-N%" corner carries: on a photo the
          two are the only marks that mean "this costs you less", and giving
          them one colour keeps that reading. */}
      <span className="flex h-[1.5em] w-[1.5em] shrink-0 items-center justify-center rounded-full bg-sale text-[0.9em] leading-none text-white">
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
 * Resolves the offer itself from the catalog (see useProductGift), so a card
 * only has to render it. The opposite corner reads the same answer, because the
 * two chips share the top of one photo: where this one is shown, ProductBadge
 * marks its corner to give the free bulbs up on a photo too narrow for both —
 * a phone's two-column grid, and nothing wider (see index.css).
 */
export function GiftBadge({ product, className = '' }) {
  const { t } = useLanguage();
  const gift = useProductGift(product);
  if (!gift) return null;

  // The label is written in /admin and normally opens with a "+". Split that
  // off into its own element so the text beside it wraps as a block of its own:
  // left in the string, the second line starts under the plus instead of under
  // the first letter, and the label reads as two ragged fragments rather than
  // one phrase. A label written without a leading plus is untouched.
  const label = t('product.giftBadge');
  const [, lead = '', rest = label] = label.match(/^\s*(\+)\s+(.+)$/s) ?? [];

  return (
    <span
      className={`pointer-events-none absolute left-[0.5em] top-[0.5em] z-10 flex max-w-[54%] items-start gap-[0.35em] rounded-[0.4em] bg-background/95 px-[0.5em] py-[0.3em] text-[clamp(0.62rem,3.7cqw,1rem)] font-medium leading-tight text-promo ${className}`}
    >
      {/* Aligned to the top rather than centred: the label runs to two lines on
          a narrow tile, and the icon belongs beside the first of them. */}
      <IconGift className="mt-[0.1em] h-[1.1em] w-[1.1em] shrink-0" />
      {lead && <span className="shrink-0">{lead}</span>}
      {/* Wraps rather than runs on: the text is written in /admin and can be as
          long as the shop wants it, while the opposite corner belongs to the
          "-N%" badge. The cap is a share of the photo's width, not of this
          badge's own font size: the discount is set larger, so an em-based cap
          measured against this text let the two overlap on a phone.

          Sentence case, not the uppercase-with-tracking the other badges use:
          those carry one short word, this carries a sentence the shop writes
          itself, and set the same way it broke to three lines on a two-column
          phone grid with the leading "+" stranded on a line of its own. */}
      <span>{rest}</span>
    </span>
  );
}
