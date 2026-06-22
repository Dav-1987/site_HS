import { useEffect, useRef } from 'react';
import { resolveImage } from '../data/catalog.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';

/**
 * Fullscreen media viewer for a product's unified gallery — photos AND videos
 * in a single feed. Each item is `{ type: 'image' | 'video', src }`. Swipe
 * (touch), arrow buttons and keyboard (←/→/Esc) navigate; clicking the backdrop
 * closes. Controlled via `index` + `onIndex` so the underlying gallery stays in
 * sync.
 *
 * Videos render with native controls; swipe-to-navigate and the edge tap zones
 * are disabled while a video is shown so its controls (seek/fullscreen) stay
 * fully usable — navigate away from a video with the ‹ › buttons or arrow keys.
 *
 * A11y: it's a modal dialog, so focus is trapped inside while open (Tab/
 * Shift+Tab cycle within), the first control is focused on open, and focus is
 * restored to the triggering element on close.
 */
export default function Lightbox({ items, index, alt = '', onClose, onIndex }) {
  const { t } = useLanguage();
  const startX = useRef(null);
  const dialogRef = useRef(null);
  const multi = items.length > 1;
  const current = items[index];
  const isVideo = current?.type === 'video';
  const go = (dir) => onIndex((index + dir + items.length) % items.length);

  // Keep the latest nav callbacks reachable from the mount-only keydown handler
  // below without re-binding it (which would re-steal focus on every arrow press).
  const navRef = useRef({});
  navRef.current = { index, len: items.length, multi, onClose, onIndex };

  useEffect(() => {
    const dialog = dialogRef.current;
    const prevFocus = document.activeElement;
    const focusables = () =>
      dialog
        ? Array.from(
            dialog.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])'),
          )
        : [];

    focusables()[0]?.focus();

    const onKey = (e) => {
      const { index: i, len, multi: m, onClose: close, onIndex: setIdx } = navRef.current;
      if (e.key === 'Escape') {
        close();
      } else if (m && e.key === 'ArrowRight') {
        setIdx((i + 1) % len);
      } else if (m && e.key === 'ArrowLeft') {
        setIdx((i - 1 + len) % len);
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

    // Push a history entry so the browser Back button closes the lightbox
    // instead of navigating away from the page.
    let closedByBack = false;
    history.pushState({ lightbox: true }, '');
    const onPop = () => {
      closedByBack = true;
      navRef.current.onClose();
    };

    document.addEventListener('keydown', onKey);
    window.addEventListener('popstate', onPop);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('popstate', onPop);
      document.body.style.overflow = '';
      if (prevFocus instanceof HTMLElement) prevFocus.focus();
      // If closed by X / backdrop (not Back button), pop our extra history entry.
      if (!closedByBack) history.back();
    };
    // Mount-only: live values are read from navRef, focusables() re-queries the DOM.
  }, []);

  const arrow =
    'absolute top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center text-3xl text-background/70 transition-colors hover:text-background focus-visible:outline-none focus-visible:text-background';

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/95 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={alt || t('lightbox.label')}
      onClick={onClose}
      onTouchStart={(e) => {
        // Let the video's own controls handle touches (seek/scrub).
        if (isVideo) return;
        startX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (isVideo || startX.current == null) return;
        const dx = e.changedTouches[0].clientX - startX.current;
        if (multi && Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        startX.current = null;
      }}
    >
      {isVideo ? (
        <video
          key={current.src}
          src={current.src}
          controls
          autoPlay
          playsInline
          className="max-h-[88vh] w-auto max-w-[92vw] bg-black object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <img
          src={resolveImage(current.src, 2000)}
          alt={alt}
          className="max-h-[88vh] w-auto max-w-[92vw] object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Full-height edge tap zones — sit above the image but below the
          controls (z-10) so they intercept taps without swallowing clicks
          on the close/prev/next buttons in the corners. Hidden for videos so
          the native controls (seek bar, fullscreen) aren't blocked. */}
      {multi && !isVideo && (
        <>
          <div
            className="absolute left-0 top-0 h-full w-[22%] cursor-pointer"
            onClick={(e) => { e.stopPropagation(); go(-1); }}
            aria-hidden="true"
          />
          <div
            className="absolute right-0 top-0 h-full w-[22%] cursor-pointer"
            onClick={(e) => { e.stopPropagation(); go(1); }}
            aria-hidden="true"
          />
        </>
      )}

      <button
        type="button"
        onClick={onClose}
        aria-label={t('lightbox.close')}
        className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center text-2xl text-background/70 transition-colors hover:text-background focus-visible:outline-none focus-visible:text-background"
      >
        ✕
      </button>

      {multi && (
        <button
          type="button"
          aria-label={t('carousel.prev')}
          onClick={(e) => {
            e.stopPropagation();
            go(-1);
          }}
          className={`${arrow} left-2 z-10`}
        >
          ‹
        </button>
      )}

      {multi && (
        <button
          type="button"
          aria-label={t('carousel.next')}
          onClick={(e) => {
            e.stopPropagation();
            go(1);
          }}
          className={`${arrow} right-2 z-10`}
        >
          ›
        </button>
      )}

      {multi && (
        <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs uppercase tracking-[0.2em] text-background/60">
          {index + 1} / {items.length}
        </span>
      )}
    </div>
  );
}
