import { useEffect, useRef } from 'react';

/**
 * The frame the catalog opens a product or a category's settings in.
 *
 * Wide screens (`sheet` off): a column beside the list, held in view while the
 * page scrolls, so the list stays in reach — another product is one click
 * away, and the panel shows the one being edited without hiding which it is.
 * Narrower screens (`sheet` on): the whole screen, as a dialog, since there is
 * no room beside the list.
 *
 * `header` stays put, `children` scroll, `footer` stays at the bottom.
 */
export default function SidePanel({ sheet, labelledBy, onClose, header, footer, children }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!sheet) return undefined;
    ref.current?.focus();
    // The page behind a full-screen sheet must not scroll along with it.
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [sheet]);

  const body = (
    <>
      <div className="shrink-0 border-b border-primary/15">{header}</div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      {footer && <div className="shrink-0 border-t border-primary/15">{footer}</div>}
    </>
  );

  if (!sheet) {
    return (
      <aside
        aria-labelledby={labelledBy}
        className="sticky top-24 flex max-h-[calc(100vh-7rem)] flex-col border border-primary/15 bg-background shadow-floating"
      >
        {body}
      </aside>
    );
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      tabIndex={-1}
      onKeyDown={(e) => {
        // Escape belongs to an open "⋯" menu first, if there is one.
        if (e.key === 'Escape' && !ref.current?.querySelector('[role="menu"]')) onClose();
      }}
      className="fixed inset-0 z-40 flex flex-col bg-background outline-none"
    >
      {body}
    </div>
  );
}
