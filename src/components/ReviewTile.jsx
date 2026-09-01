import { useEffect, useRef } from 'react';
import Media from './Media.jsx';
import { posterFor } from '../data/settings.js';
import { resolveImage } from '../data/catalog.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';

/**
 * One item on the reviews wall: a screenshot of a real message, or a customer's
 * clip.
 *
 * Everything is cropped to 4:5 before upload (the admin says so in the upload
 * hint), which is why this is an ordinary fixed-ratio tile and not a masonry
 * cell — the wall then lines up with the product grid used everywhere else.
 *
 * There is deliberately no rating, no caption and no author line: the
 * screenshot is the review. The accessible name says what the image is rather
 * than what it says — we don't have the text, and inventing one would be worse
 * than a plain, honest label.
 */
export default function ReviewTile({ review, index, onOpen }) {
  const { t } = useLanguage();
  const videoRef = useRef(null);
  const frameRef = useRef(null);
  const isVideo = Boolean(review?.video);
  const label = `${t('reviews.alt')} ${index + 1}`;

  // Autoplay the clip (muted, looped) only while the tile is on screen, and
  // pause it the moment it scrolls away — a wall of a dozen clips all playing
  // at once would be several megabytes a second on a phone. Mirrors the same
  // behaviour in ProductCard.
  useEffect(() => {
    if (!isVideo) return undefined;
    const v = videoRef.current;
    if (!v) return undefined;
    const tryPlay = () => {
      const p = v.play();
      if (p?.catch) p.catch(() => {});
    };
    const el = frameRef.current;
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
  }, [isVideo]);

  return (
    <button
      type="button"
      ref={frameRef}
      onClick={() => onOpen(index)}
      aria-label={label}
      className="group relative block aspect-[4/5] w-full overflow-hidden bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {isVideo ? (
        <>
          <video
            ref={videoRef}
            src={review.video}
            poster={resolveImage(posterFor(review.video), 800) || undefined}
            muted
            loop
            playsInline
            preload="none"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Плашка «видео» — иначе плитка неотличима от скриншота, пока
              ролик не попал во вьюпорт и не начал играть. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-primary"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </>
      ) : (
        <Media
          id={review.image}
          alt=""
          w={800}
          className="transition-transform duration-500 group-hover:scale-105"
        />
      )}
    </button>
  );
}
