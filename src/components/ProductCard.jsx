import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Media from './Media.jsx';
import Price from './Price.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { productMedia } from '../data/catalog.js';

/** Product tile: swipeable photo/video carousel + discount-aware price. */
export default function ProductCard({ product, categorySlug, categoryName, aspectClassName = 'aspect-[4/5]' }) {
  const { lang, t } = useLanguage();
  const slug = categorySlug || product.categorySlug;
  // Canonical product URL is /<categorySlug>/<id>; the legacy /producto/<id>
  // form still works as a redirect if the slug is ever missing.
  const to = slug ? `/${slug}/${product.id}` : `/producto/${product.id}`;
  const label = categoryName ? `${product.name} — ${categoryName[lang]}` : product.name;

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
        className={`relative mb-5 ${aspectClassName} overflow-hidden bg-surface`}
        onPointerDown={(e) => {
          startX.current = e.clientX;
          swiped.current = false;
        }}
        onPointerUp={(e) => {
          if (startX.current == null) return;
          const dx = e.clientX - startX.current;
          if (multi && Math.abs(dx) > 40) {
            swiped.current = true;
            go(dx < 0 ? 1 : -1);
          }
          startX.current = null;
        }}
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
              className="pointer-events-none h-full w-full bg-surface object-cover"
            />
          ) : (
            <Media
              id={item.src}
              idMobile={idx === 0 ? product.imageMobile : ''}
              alt={label}
              w={700}
              className="transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            />
          )}
        </Link>

        {multi && (
          <>
            <button
              type="button"
              aria-label={t('carousel.prev')}
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center bg-background/80 text-lg text-primary opacity-0 transition-opacity duration-300 hover:bg-background focus-visible:opacity-100 group-hover:opacity-100"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label={t('carousel.next')}
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center bg-background/80 text-lg text-primary opacity-0 transition-opacity duration-300 hover:bg-background focus-visible:opacity-100 group-hover:opacity-100"
            >
              ›
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {media.map((m, i) => (
                <span
                  key={m.src + i}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    i === idx ? 'bg-primary' : 'bg-primary/30'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <Link to={to} aria-label={label} tabIndex={-1} className="block border-t border-primary/10 pt-4">
        <h3 className="font-serif text-xl text-primary transition-colors duration-300 group-hover:text-accent">
          {product.name}
          {product.subtitle && (
            <span className="ml-2 text-sm text-primary/45">{product.subtitle}</span>
          )}
        </h3>
        <Price product={product} className="mt-2 font-serif text-lg text-primary/80" />
      </Link>
    </article>
  );
}
