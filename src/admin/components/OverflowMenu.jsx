import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BTN_ICON } from '../ui.js';
import { menuPosition } from '../menuPosition.js';

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
        danger ? 'text-danger hover:bg-danger/10' : 'text-primary hover:bg-surface'
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
 * The popover is portalled to <body> and placed in window coordinates rather
 * than hung off its trigger: the product list scrolls sideways on narrow
 * windows, and a box that scrolls one way clips the other too, so the menu of
 * the last rows used to be cut off at the bottom of the list. It follows its
 * trigger while the page scrolls or the window changes size.
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
  const [position, setPosition] = useState(null);
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      // The popover lives outside the wrapper (see above), so it counts too.
      const inside = [ref.current, menuRef.current].some((el) => el?.contains(e.target));
      if (!inside) setOpen(false);
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

  // Measured before paint, so the popover never shows up in the wrong place.
  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return undefined;
    }
    const place = () => {
      if (!buttonRef.current || !menuRef.current) return;
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      setPosition(
        menuPosition(
          buttonRef.current.getBoundingClientRect(),
          menuRef.current.getBoundingClientRect(),
          viewport,
          align,
        ),
      );
    };
    place();
    // Capture: the list's own sideways scroll fires on the list, not the window.
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, align]);

  return (
    <div className={wrapperClassName} ref={ref}>
      <button
        type="button"
        ref={buttonRef}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={title}
        title={title}
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName || BTN_ICON}
      >
        {trigger || <span aria-hidden="true">⋯</span>}
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={title}
            // Every item is an action, so one click closes the menu — saves each
            // caller from threading a close callback through its handlers.
            onClick={() => setOpen(false)}
            style={position ?? { top: 0, left: 0, visibility: 'hidden' }}
            // z-50: above the side panel (z-40), which can hold a menu of its own.
            className="fixed z-50 min-w-[15rem] max-w-[80vw] overflow-y-auto border border-primary/15 bg-background py-1 shadow-floating"
          >
            {children}
          </div>,
          document.body,
        )}
    </div>
  );
}

/** Hairline between groups of items (state vs. destructive actions). */
export function MenuSeparator() {
  return <div className="my-1 border-t border-primary/10" role="separator" />;
}
