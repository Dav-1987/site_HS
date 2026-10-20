import { useId, useState } from 'react';
import { BTN_GHOST, BTN_SOLID, INPUT } from '../ui.js';

/**
 * An address-forming value — a product's id, a category's slug — shown locked,
 * with a deliberate «Изменить…» to change it.
 *
 * It used to be a plain field changed on every keystroke, which made renaming
 * the page's address as easy as fixing a typo in its description, with none of
 * the warning that the old address stops working. It also renamed in passing
 * through every value between the old and the new, any of which could be
 * another product's id. Now the new value is checked (`validate` returns the
 * reason it can't be used, or '') and applied once, as a whole.
 */
export default function RenameField({
  label,
  prefix = '',
  value,
  normalize = (v) => v,
  validate,
  warning,
  onRename,
}) {
  const [draft, setDraft] = useState(null); // null = not editing
  const inputId = useId();
  const error = draft === null ? '' : validate(draft);
  const unchanged = draft === value;

  const apply = () => {
    if (error || unchanged) return;
    onRename(draft);
    setDraft(null);
  };

  if (draft === null) {
    return (
      <div>
        <p className="mb-2 text-sm font-semibold">{label}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="inline-flex min-w-0 items-center gap-2 break-all text-sm">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-secondary"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>
              {prefix}
              <strong className="font-semibold">{value}</strong>
            </span>
          </span>
          <button type="button" onClick={() => setDraft(value)} className={BTN_GHOST}>
            Изменить…
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-primary/15 p-4">
      <label htmlFor={inputId} className="mb-2 block text-sm font-semibold">
        {label}
      </label>
      <input
        id={inputId}
        className={INPUT}
        value={draft}
        autoFocus
        onChange={(e) => setDraft(normalize(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') apply();
          if (e.key === 'Escape') setDraft(null);
        }}
        aria-invalid={Boolean(error)}
        aria-describedby={`${inputId}-note`}
      />
      <div id={`${inputId}-note`} className="mt-2 space-y-1 text-xs leading-relaxed">
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <p className="text-primary/75">{warning}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={apply}
          disabled={Boolean(error) || unchanged}
          className={BTN_SOLID}
        >
          Применить
        </button>
        <button type="button" onClick={() => setDraft(null)} className={BTN_GHOST}>
          Отмена
        </button>
      </div>
    </div>
  );
}
