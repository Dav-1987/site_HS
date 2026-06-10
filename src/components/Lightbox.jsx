import { useEffect, useRef } from 'react';
import { resolveImage } from '../data/catalog.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';

/**
 * Fullscreen image viewer. Swipe (touch), arrow buttons and keyboard
 * (←/→/Esc) navigate; clicking the backdrop closes. Controlled via `index`
 * + `onIndex` so the underlying gallery stays in sync.
 *
 * A11y: it's a modal dialog, so focus is trapped inside while open (Tab/
 * Shift+Tab cycle within), the first control is focused on open, and focus is
 * restored to the triggering element on close.
 */
export default function Lightbox({ images, index, alt = '', onClose, onIndex }) {
  const { t } = useLanguage();
  const startX = useRef(null);
  const dialogRef = useRef(null);
  const multi = images.length > 1;
  const go = (dir) => onIndex((index + dir + images.length) % images.length);

  // Keep the latest nav callbacks reachable from the mount-only keydown handler
  // below without re-binding it (which would re-steal focus on every arrow press).
  const navRef = useRef({});
  navRef.current = { index, len: images.length, multi, onClose, onIndex };

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

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      if (prevFocus instanceof HTMLElement) prevFocus.focus();
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
        startX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (startX.current == null) return;
        const dx = e.changedTouches[0].clientX - startX.current;
        if (multi && Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        startX.current = null;
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t('lightbox.close')}
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center text-2xl text-background/70 transition-colors hover:text-background focus-visible:outline-none focus-visible:text-background"
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
          className={`${arrow} left-2`}
        >
          ‹
        </button>
      )}

      <img
        src={resolveImage(images[index], 2000)}
        alt={alt}
        className="max-h-[88vh] w-auto max-w-[92vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {multi && (
        <button
          type="button"
          aria-label={t('carousel.next')}
          onClick={(e) => {
            e.stopPropagation();
            go(1);
          }}
          className={`${arrow} right-2`}
        >
          ›
        </button>
      )}

      {multi && (
        <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs uppercase tracking-[0.2em] text-background/60">
          {index + 1} / {images.length}
        </span>
      )}
    </div>
  );
}
