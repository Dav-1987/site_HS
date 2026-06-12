// Shared look + validation bits for the public forms (Contact, Cart). One
// source of truth so both forms stay visually identical.

const FIELD =
  'w-full border-b bg-transparent py-3 text-primary placeholder:text-primary/35 transition-colors focus:outline-none';

export const LABEL = 'mb-2 block text-xs uppercase tracking-[0.2em] text-primary/50';
export const ERROR = 'mt-2 text-xs text-danger/90';

export const SUBMIT =
  'inline-flex items-center justify-center gap-3 bg-primary px-9 py-4 text-xs uppercase tracking-[0.2em] text-background transition-colors duration-300 hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-primary disabled:hover:text-background';

// Honeypot input — visually hidden, off the tab order, ignored by users.
export const HONEYPOT = 'absolute left-[-9999px] h-0 w-0 opacity-0';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Field class with the error/normal border variant baked in. */
export const inputClass = (hasError) =>
  `${FIELD} ${hasError ? 'border-danger/70' : 'border-primary/20 focus:border-accent'}`;
