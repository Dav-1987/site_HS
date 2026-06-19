import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Media from './Media.jsx';
import Price from './Price.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';

/** True on devices that have a real hover-capable pointer (desktop mouse). */
function hoverCapable() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches
  );
}

/**
 * Home "Featured" card: a cover image + product name/price that links to the
 * product, with an optional video layered over the cover.
 *  - Pointer (desktop): cover by default, the video fades in on hover.
 *  - Touch (mobile): the video plays while the card is (almost) fully in view, so
 *    the snapped-in card plays while the peeking neighbour keeps showing its cover.
 *
 * The whole tile is a link and the video carries no controls (and ignores
 * pointer events), so a tap/click always navigates to the product rather than
 * opening a player.
 */
export default function FeaturedCard({ item, aspectClassName = 'aspect-[4/5]' }) {
  const { lang } = useLanguage();
  const slug = item.categorySlug;
  const to = slug ? `/${slug}/${item.id}` : `/producto/${item.id}`;
  const label = item.category ? `${item.name} — ${item.category[lang]}` : item.name;
  const video = item.featuredVideo;
  const cover = item.featuredCover;

  const videoRef = useRef(null);
  const cardRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  const play = () => {
    const v = videoRef.current;
    if (!v) return;
    const p = v.play();
    if (p?.catch) p.catch(() => {});
    setPlaying(true);
  };
  const stop = () => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    setPlaying(false);
  };

  // Touch devices drive playback from visibility instead of hover: play once the
  // card is mostly on screen, pause when it scrolls away.
  useEffect(() => {
    if (!video || hoverCapable()) return undefined;
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.8) play();
        else stop();
      },
      { threshold: [0, 0.8, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [video]);

  // Desktop only: hover toggles the video. (Touch is handled by the observer.)
  const hover = video && hoverCapable();
  const hoverHandlers = hover ? { onMouseEnter: play, onMouseLeave: stop } : {};

  return (
    <article className="group">
      <Link
        ref={cardRef}
        to={to}
        aria-label={label}
        {...hoverHandlers}
        className={`relative mb-5 block ${aspectClassName} overflow-hidden bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-background`}
      >
        <Media
          id={cover}
          alt={label}
          w={700}
          className="transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
        {video && (
          <video
            ref={videoRef}
            src={video}
            muted
            loop
            playsInline
            preload="none"
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
              playing ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}
      </Link>

      <Link to={to} aria-label={label} tabIndex={-1} className="block border-t border-primary/10 pt-4">
        <h3 className="font-serif text-xl text-primary transition-colors duration-300 group-hover:text-accent">
          {item.name}
          {item.subtitle && <span className="ml-2 text-sm text-primary/45">{item.subtitle}</span>}
        </h3>
        <Price product={item} className="mt-2 font-serif text-lg text-primary/80" />
      </Link>
    </article>
  );
}
