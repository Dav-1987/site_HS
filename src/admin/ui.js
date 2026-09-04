// Shared Tailwind class strings for the admin panel, kept in one place so the
// split-out editor components stay visually consistent.
//
// Mobile-first: the phone gets bigger type and 44px tap targets, and the
// desktop look is restored from `sm:` up, so the panel a laptop shows is the
// one it always showed.
export const INPUT =
  'mt-1 min-h-11 w-full border border-primary/15 bg-background px-3 py-2.5 text-base text-primary transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:min-h-0 sm:py-2 sm:text-sm';
// 11px of letterspaced caps is a desktop detail; on a phone it needs the size
// and the contrast to stay a readable label.
export const LABEL =
  'text-xs tracking-[0.1em] text-primary/60 uppercase sm:text-[11px] sm:tracking-[0.18em] sm:text-primary/45';
export const BTN_SOLID =
  'inline-flex min-h-11 items-center justify-center gap-2 bg-primary px-5 py-2.5 text-xs uppercase tracking-[0.18em] text-background transition-colors hover:bg-accent hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-0';
export const BTN_GHOST =
  'inline-flex min-h-11 items-center justify-center gap-2 border border-primary/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-primary transition-colors hover:border-accent hover:text-accent disabled:opacity-40 sm:min-h-0';
// Single-glyph controls (⧉ ↑ ↓ ⋯). Square and finger-sized on a phone, back to
// the compact desktop button from `sm:` up.
export const BTN_ICON =
  'inline-flex h-11 w-11 items-center justify-center border border-primary/20 text-base text-primary transition-colors hover:border-accent hover:text-accent disabled:opacity-40 sm:h-auto sm:w-auto sm:px-4 sm:py-2 sm:text-xs sm:uppercase sm:tracking-[0.18em]';
