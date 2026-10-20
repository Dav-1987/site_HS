import { useId, useState } from 'react';

/**
 * A titled block of a section that folds away — «Главный экран», «Избранное»,
 * «Отзывы» and the rest. One component rather than the same header copied
 * into seven editors, each with its own spacing and an English caption
 * ("HERO", "FOOTER") beside the Russian title.
 *
 * `summary` is what the block holds, shown folded so it need not be opened for
 * a glance ("2 карточки", "раздел выключен"). The body unmounts when folded;
 * the data lives in the admin's state, so nothing is lost.
 */
export default function Collapsible({ title, summary, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  return (
    <section className="border border-primary/15 bg-surface">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:px-5 sm:py-4"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-serif text-xl font-light">{title}</span>
          {/* The space keeps the name read as "Избранное 2 карточки". */}
          {summary && ' '}
          {summary && (
            <span className="ml-auto pl-3 text-right text-sm text-primary/75">{summary}</span>
          )}
        </button>
      </h2>
      {open && (
        <div id={bodyId} className="space-y-4 border-t border-primary/10 px-4 py-6 sm:px-5">
          {children}
        </div>
      )}
    </section>
  );
}
