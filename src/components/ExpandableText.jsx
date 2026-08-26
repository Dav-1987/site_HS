import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';

/**
 * A description shown by its opening paragraph, with a control to open the rest.
 *
 * Every paragraph is always in the markup — collapsing hides them with CSS. That
 * is the point rather than an implementation detail: Google indexes text it can
 * find in the HTML, and text inserted on click is text a crawler never sees.
 * These descriptions exist to be found, so hiding them behind a fetch would undo
 * the reason for writing them.
 *
 * Paragraphs, not clamped lines: a line clamp counts the blank line between
 * paragraphs as a line and strands its ellipsis on a row of its own.
 */
export default function ExpandableText({ text, className = '' }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const paragraphs = String(text ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return null;
  const hasMore = paragraphs.length > 1;

  return (
    <div className={className}>
      {paragraphs.map((paragraph, i) => (
        <p
          key={paragraph.slice(0, 40) + i}
          className={`whitespace-pre-line leading-relaxed text-secondary ${i > 0 ? 'mt-4' : ''} ${
            i > 0 && !open ? 'hidden' : ''
          }`}
        >
          {paragraph}
        </p>
      ))}
      {hasMore && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="touch-target mt-3 text-sm text-accent-text underline underline-offset-4 transition-opacity duration-300 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-text"
        >
          {open ? t('product.less') : t('product.more')}
        </button>
      )}
    </div>
  );
}
