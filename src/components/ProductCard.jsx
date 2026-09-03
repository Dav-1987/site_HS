import { useEffect, useRef, useState } from 'react';
import { Link } from './LocalizedLink.jsx';
import Media from './Media.jsx';
import Price from './Price.jsx';
import ProductBadge, { SOLD_OUT_MEDIA } from './ProductBadge.jsx';
import { GiftBadge } from './Gift.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { isInStock, productDisplayName, productFullName, productMedia } from '../data/catalog.js';

/** Product tile: swipeable photo/video carousel + discount-aware price. */
export default function ProductCard({
  product,
  categorySlug,
  categoryName,
  aspectClassName = 'aspect-[4/5]',
}) {
  const { lang, t } = useLanguage();
  const dim = isInStock(product) ? '' : SOLD_OUT_MEDIA;
  const slug = categorySlug || product.categorySlug;
  // Canonical product URL is /<categorySlug>/<id>; the legacy /producto/<id>
  // form still works as a redirect if the slug is ever missing.
  const to = slug ? `/${slug}/${product.id}` : `/producto/${product.id}`;
  // A tile shows the short name; the full one, which the product page and the
  // <title> carry, would wrap a card to four lines. The accessible label keeps
  // the full name — a screen reader gains from the detail a tile has no room
  // for. See productDisplayName.
  const shortName = productDisplayName(product, lang);
  const fullName = productFullName(product, lang);
  const label = categoryName ? `${fullName} — ${categoryName[lang]}` : fullName;

  // Unified, ordered media (photos + videos), exactly as the product page shows
  // it — so a video-first product plays its video on the card too, and swiping
  // moves across photos and videos alike.
  const media = productMedia(product);
  const multi = media.length > 1;
  const [idx, setIdx] = useState(0);
  const startX = useRef(null);
  const swiped = useRef(false);
  const cardRef = useRef(null);
  const videoRef = useRef(null);

  const go = (dir) => setIdx((i) => (i + dir + media.length) % media.length);

  // Shared swipe logic for touch and mouse/pen. Touch uses real touch events
  // (below); mouse/pen uses pointer events. Touch pointer events are NOT used
  // for swiping — the browser cancels them when it claims the gesture for
  // vertical scroll, so on phones pointerup never fires and the swipe is lost.
  const startSwipe = (x) => {
    startX.current = x;
    swiped.current = false;
  };
  const endSwipe = (x) => {
    if (startX.current == null) return;
    const dx = x - startX.current;
    if (multi && Math.abs(dx) > 40) {
      swiped.current = true; // a swipe ends with a click — suppress navigation
      go(dx < 0 ? 1 : -1);
    }
    startX.current = null;
  };

  // A product can legitimately have no media at all: /admin's "+ Добавить товар"
  // creates one with an empty gallery, and it may well be saved before the
  // photos are uploaded. `item` is then undefined — `Media` renders the branded
  // placeholder for an empty id (the same fallback it uses when a photo fails to
  // load), and the video branch below can't be reached without a real item.
  const item = media[idx] || media[0];
  const isVideo = item?.type === 'video';

  // Autoplay the active video (muted, looped) while the card is on screen; pause
  // it when it scrolls away so a grid of video-first cards stays light.
  useEffect(() => {
    if (!isVideo) return undefined;
    const v = videoRef.current;
    if (!v) return undefined;
    const tryPlay = () => {
      const p = v.play();
      if (p?.catch) p.catch(() => {});
    };
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      tryPlay();
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) tryPlay();
        else v.pause();
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [isVideo, idx]);

  return (
    <article className="group">
      <div
        ref={cardRef}
        className={`relative mb-5 ${aspectClassName} touch-pan-y overflow-hidden bg-surface [container-type:inline-size]`}
        onPointerDown={(e) => {
          if (e.pointerType !== 'touch') startSwipe(e.clientX);
        }}
        onPointerUp={(e) => {
          if (e.pointerType !== 'touch') endSwipe(e.clientX);
        }}
        onTouchStart={(e) => startSwipe(e.touches[0].clientX)}
        onTouchEnd={(e) => endSwipe(e.changedTouches[0].clientX)}
      >
        <Link
          to={to}
          aria-label={label}
          onClick={(e) => {
            // A swipe ends with a click — don't navigate in that case.
            if (swiped.current) {
              e.preventDefault();
              swiped.current = false;
            }
          }}
          className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        >
          {isVideo ? (
            // No controls + pointer-events-none → a tap/click navigates to the
            // product (and still bubbles to the swipe handler) instead of
            // toggling the player.
            <video
              key={item.src}
              ref={videoRef}
              src={item.src}
              muted
              loop
              playsInline
              preload="metadata"
              aria-label={label}
              className={`pointer-events-none h-full w-full bg-surface object-cover ${dim}`}
            />
          ) : (
            <Media
              id={item?.src}
              idMobile={idx === 0 ? product.imageMobile : ''}
              alt={fullName}
              w={700}
              className={`transition-transform duration-700 ease-out group-hover:scale-[1.04] ${dim}`}
            />
          )}
        </Link>

        <ProductBadge product={product} />
        <GiftBadge product={product} />

        {multi && (
          <>
            <button
              type="button"
              aria-label={t('carousel.prev')}
              onClick={() => go(-1)}
              className="touch-target absolute left-1 top-1/2 flex -translate-y-1/2 items-center justify-center bg-background/80 text-lg text-primary opacity-0 transition-opacity duration-300 hover:bg-background focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent group-hover:opacity-100"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label={t('carousel.next')}
              onClick={() => go(1)}
              className="touch-target absolute right-1 top-1/2 flex -translate-y-1/2 items-center justify-center bg-background/80 text-lg text-primary opacity-0 transition-opacity duration-300 hover:bg-background focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent group-hover:opacity-100"
            >
              ›
            </button>
            <div className="no-scrollbar absolute bottom-0 left-1/2 flex max-w-full -translate-x-1/2 overflow-x-auto">
              {media.map((m, i) => (
                <button
                  key={m.src + i}
                  type="button"
                  aria-label={`${t('carousel.goTo')} ${i + 1}`}
                  aria-current={i === idx}
                  onClick={(e) => {
                    e.preventDefault();
                    setIdx(i);
                  }}
                  className="flex min-h-[44px] flex-none items-center justify-center px-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                >
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${
                      i === idx ? 'bg-primary' : 'bg-primary/30'
                    }`}
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <Link
        to={to}
        aria-label={label}
        tabIndex={-1}
        className="block border-t border-primary/10 pt-4"
      >
        <h3 className="font-serif text-xl text-primary transition-colors duration-300 group-hover:text-accent-text">
          {shortName}
          {/* Own line + nowrap: on a narrow 2-column card the dimensions used to
              break mid-string ("… 140" / "cm"), which read as a stray line. */}
          {product.subtitle && (
            <span className="block whitespace-nowrap text-xs text-primary/45 sm:text-sm">
              {product.subtitle}
            </span>
          )}
        </h3>
        <Price product={product} className="mt-2 font-serif text-lg text-primary/80" />
      </Link>
    </article>
  );
}
