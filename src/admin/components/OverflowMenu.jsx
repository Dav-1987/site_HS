import { useEffect, useRef, useState } from 'react';
import { BTN_ICON } from '../ui.js';

// Shared class for anything acting as a row in the menu — MenuItem below, and
// the file-picker <label> in ProductImagesEditor, which has to be a label
// rather than a button so it can wrap a hidden <input type="file">.
export const MENU_ITEM =
  'flex min-h-11 w-full cursor-pointer items-center gap-2 px-4 text-left text-xs uppercase tracking-[0.14em] transition-colors disabled:cursor-not-allowed disabled:opacity-30';

/**
 * `keepOpen` is for the rare item whose result appears inside the menu itself
 * (the rebuild button reports progress in its own label) — everything else
 * finishes the interaction, so the menu closes behind it.
 */
export function MenuItem({ onClick, disabled, danger, checked, keepOpen, children }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={(e) => {
        if (keepOpen) e.stopPropagation();
        onClick?.(e);
      }}
      disabled={disabled}
      className={`${MENU_ITEM} ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-primary hover:bg-surface'
      }`}
    >
      {/* A fixed-width slot keeps the labels aligned whether or not a row is
          a checkable state (visibility, stock) that currently applies. */}
      {checked !== undefined && (
        <span className="w-3 shrink-0 text-accent-text">{checked ? '✓' : ''}</span>
      )}
      {children}
    </button>
  );
}

/**
 * A "⋯" popover for controls that don't fit a phone-width row. Closes on
 * outside click, on Escape, and after any item inside is activated.
 *
 * `trigger` replaces the ⋯ glyph when the whole thing being tapped is the
 * control (a photo tile, say) rather than a separate button next to it.
 */
export default function OverflowMenu({
  title = 'Ещё',
  trigger,
  triggerClassName,
  wrapperClassName = 'relative shrink-0',
  children,
  align = 'right',
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className={wrapperClassName} ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={title}
        title={title}
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName || BTN_ICON}
      >
        {trigger || <span aria-hidden="true">⋯</span>}
      </button>

      {open && (
        <div
          role="menu"
          aria-label={title}
          // Every item is an action, so one click closes the menu — saves each
          // caller from threading a close callback through its handlers.
          onClick={() => setOpen(false)}
          className={`absolute top-full z-40 mt-1 min-w-[15rem] max-w-[80vw] border border-primary/15 bg-background py-1 shadow-floating ${
            align === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/** Hairline between groups of items (state vs. destructive actions). */
export function MenuSeparator() {
  return <div className="my-1 border-t border-primary/10" role="separator" />;
}
