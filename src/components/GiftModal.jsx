import { useEffect, useId, useRef, useState } from 'react';
import Lightbox from './Lightbox.jsx';
import Media from './Media.jsx';
import { IconGift } from './Gift.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';

/**
 * The gift, opened from the inset in the corner of the product's photo.
 *
 * The inset can say four words and show one thumbnail; someone who taps it
 * wants the rest — what the piece actually looks like from more than one angle,
 * how big it is, and what it would have cost. That is the whole content of this
 * dialog, and it is why the inset became a button.
 *
 * Takes the offer productGift() already resolved rather than looking it up
 * again, so a gift the shop sells and one it does not arrive here in the same
 * shape and this file never has to know which it is holding: the catalog side
 * fills `images`/`size`/`price` from the product, the custom side from what was
 * typed in /admin. `href` is ignored here on purpose — nothing in this dialog
 * leads away. It is opened from a product page to look at what comes free with
 * the piece being bought, and a way out of it is a way off that piece; the
 * sentence under the price still names the gift and still links it, for anyone
 * who wants the page itself.
 *
 * The photos are a carousel rather than a strip of thumbnails: arrows, swipe,
 * arrow keys and a dot per photo, the same idiom as a catalog tile and the
 * product gallery. The dots stay visible where a tile's arrows wait for a
 * hover — with no thumbnails they are the only thing saying there is a second
 * photo at all.
 *
 * Zoom is the site's own Lightbox stacked on top. The layers here are z-95:
 * above the cookie banner at z-90, which otherwise paints over this one's
 * backdrop, and below the Lightbox and the order form at z-100, which are meant
 * to cover it. Two modal dialogs at once needs care in exactly four places, and
 * each is handled below: the Escape key, the focus trap, the scroll lock, and
 * the Back button — every one of them a thing both layers listen for, where the
 * upper one has to answer and the lower one has to keep quiet.
 */
export default function GiftModal({ gift, isOpen, onClose }) {
  const { t } = useLanguage();
  const titleId = useId();
  const dialogRef = useRef(null);
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);

  const startX = useRef(null);
  const swiped = useRef(false);

  const images = gift?.images?.length ? gift.images : gift?.image ? [gift.image] : [];
  const multi = images.length > 1;
  const go = (dir) => setActive((i) => (i + dir + images.length) % images.length);

  // A fresh open starts at the first photo — the one the inset was showing.
  useEffect(() => {
    if (isOpen) {
      setActive(0);
      setZoom(false);
    }
  }, [isOpen]);

  // Kept in a ref so the history effect below can stay keyed on `isOpen` alone:
  // it pushes an entry when it runs, and re-running it on every close handler
  // React hands us would push one per render.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Back closes the dialog instead of leaving the page. On a phone that is the
  // gesture people actually use to dismiss something covering the screen, and
  // without this it walked them off the product they were looking at.
  //
  // The care here is that the Lightbox pushes an entry of its own on top of
  // this one, so while the zoom is up there are two popstate listeners and one
  // Back press reaches both. They are told apart by what the pop lands on: our
  // own marker still being the current state means the entry that just went was
  // the zoom's, not ours, and this dialog stays open. That covers the press
  // itself and, just as importantly, the `history.back()` the Lightbox fires
  // when it is dismissed by its own X — which would otherwise close this dialog
  // as a side effect of closing the photo.
  useEffect(() => {
    if (!isOpen) return undefined;
    let closedByBack = false;
    history.pushState({ giftModal: true }, '');
    const onPop = () => {
      if (history.state?.giftModal) return;
      closedByBack = true;
      closeRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      // Closed by the X, the backdrop or Escape: our entry is still on the
      // stack and has to come off, or the next Back would be swallowed doing
      // nothing visible.
      if (!closedByBack) history.back();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const dialog = dialogRef.current;
    const prevFocus = document.activeElement;
    const focusables = () =>
      dialog
        ? Array.from(dialog.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])'))
        : [];

    focusables()[0]?.focus();

    const onKey = (e) => {
      // While the zoom is up it owns the keyboard: it has its own Escape and
      // its own trap, and answering here too would close both layers with one
      // press — the photo and the dialog that opened it.
      if (zoom) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (multi && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        // The zoom answers the same two keys, so the carousel behaves the same
        // whether or not it has been opened full-screen.
        setActive((i) => (i + (e.key === 'ArrowRight' ? 1 : -1) + images.length) % images.length);
      } else if (e.key === 'Tab') {
        const f = focusables();
        if (f.length === 0) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (prevFocus instanceof HTMLElement) prevFocus.focus();
    };
  }, [isOpen, zoom, onClose, multi, images.length]);

  // Re-applied when the zoom closes: the Lightbox unlocks the body on its way
  // out, and without this the page behind would start scrolling again while
  // this dialog is still covering it. React runs both cleanups before this
  // effect, so the lock is the last word.
  useEffect(() => {
    if (!isOpen) return undefined;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, zoom]);

  if (!isOpen || !gift) return null;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[95] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto bg-background shadow-floating">
        <button
          type="button"
          onClick={onClose}
          aria-label={t('nav.close')}
          className="touch-target absolute right-2 top-2 z-10 flex items-center justify-center text-xl text-primary/50 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          ×
        </button>

        {images.length > 0 && (
          <div
            className="group relative"
            onTouchStart={(e) => {
              startX.current = e.touches[0].clientX;
              swiped.current = false;
            }}
            onTouchEnd={(e) => {
              if (startX.current == null) return;
              const dx = e.changedTouches[0].clientX - startX.current;
              if (multi && Math.abs(dx) > 40) {
                // Remembered so the tap that ends the swipe does not also open
                // the zoom — the same guard the product page's own gallery
                // uses, for the same gesture.
                swiped.current = true;
                go(dx < 0 ? 1 : -1);
              }
              startX.current = null;
            }}
          >
            <button
              type="button"
              onClick={() => {
                if (swiped.current) {
                  swiped.current = false;
                  return;
                }
                setZoom(true);
              }}
              aria-label={`${t('product.zoom')}: ${gift.name}`}
              className="block w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
            >
              {/* 4:5, the ratio every other photo of a piece is cropped to on
                  this site — a gift shown in a shape of its own would read as
                  coming from somewhere else — but capped in height, which is
                  the ratio losing an argument it should lose. At 4:5 the photo
                  alone is 560px inside a 448px panel, and on a laptop that put
                  the gift's name, its dimensions and its price below the fold
                  of the dialog: it opened onto a picture and nothing else, and
                  the one thing it exists to say needed a scroll. */}
              {/* `w-full` is load-bearing next to the cap: with only a height
                  limit the ratio runs the other way and derives the width from
                  it, leaving the photo 44px narrower than the panel with a bare
                  strip of background beside it. Width first, then the cap
                  clips the height and object-cover takes care of the rest. */}
              <span className="block w-full max-h-[46vh] overflow-hidden bg-surface [aspect-ratio:4/5]">
                <Media id={images[active]} alt={gift.name} w={900} />
              </span>
            </button>

            {multi && (
              <>
                {/* Siblings of the zoom button, never nested inside it: a
                    button within a button is invalid, and the browser picks
                    which one a click means. */}
                <button
                  type="button"
                  aria-label={t('carousel.prev')}
                  onClick={() => go(-1)}
                  className="touch-target absolute left-1 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center bg-background/80 text-xl text-primary transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label={t('carousel.next')}
                  onClick={() => go(1)}
                  className="touch-target absolute right-1 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center bg-background/80 text-xl text-primary transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  ›
                </button>
                {/* Always shown, unlike the arrows on a catalog tile that wait
                    for a hover: with the thumbnails gone these dots are the
                    only thing saying there is more than one photo, and a
                    dialog opened on purpose should not hide that. */}
                <div className="no-scrollbar absolute bottom-0 left-1/2 z-10 flex max-w-full -translate-x-1/2 overflow-x-auto">
                  {images.map((src, i) => (
                    <button
                      key={`${src}-${i}`}
                      type="button"
                      aria-label={`${t('carousel.goTo')} ${i + 1}`}
                      aria-current={i === active}
                      onClick={() => setActive(i)}
                      className="flex min-h-[44px] flex-none items-center justify-center px-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                    >
                      <span
                        aria-hidden="true"
                        className={`h-1.5 w-1.5 rounded-full transition-colors ${
                          i === active ? 'bg-primary' : 'bg-primary/40'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="px-6 py-6">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-promo">
            <IconGift className="h-4 w-4 shrink-0" />
            {t('product.giftLabel')}
          </p>

          <h2 id={titleId} className="mt-3 font-serif text-2xl font-light text-primary">
            {gift.shortName || gift.name}
          </h2>

          {gift.size && (
            <p className="mt-2 text-sm text-secondary">
              <span className="uppercase tracking-[0.12em] text-primary/40">
                {t('product.giftSize')}
              </span>{' '}
              {gift.size}
            </p>
          )}

          {/* The number is struck through wherever it is shown, here and in the
              line under the product's price: what it says is not what this
              costs but what it would have cost, and the word beside it is the
              actual price. */}
          {gift.price ? (
            <p className="mt-4 flex items-baseline gap-2">
              <span className="text-lg text-primary/35 line-through">
                {gift.price} {t('common.currency')}
              </span>
              <span className="font-serif text-2xl text-promo">{t('product.giftFree')}</span>
            </p>
          ) : null}
        </div>
      </div>

      {zoom && (
        <Lightbox
          items={images.map((src) => ({ type: 'image', src }))}
          index={active}
          alt={gift.name}
          onClose={() => setZoom(false)}
          onIndex={setActive}
        />
      )}
    </div>
  );
}
