// Shared Tailwind class strings for the admin panel, kept in one place so the
// split-out editor components stay visually consistent.
//
// Mobile-first: the phone gets bigger type and 44px tap targets, and the
// desktop look is restored from `sm:` up, so the panel a laptop shows is the
// one it always showed.
// A field's outline is 55% ink, 3.3:1 against the page — the 3:1 a control's
// edge needs to be found at all (it was 15%, 1.3:1).
// INPUT_BASE is the field alone, for one that stands without a label above it
// (a search box, a select in a toolbar); INPUT adds the gap under its label.
// Two strings rather than an override: of two conflicting Tailwind classes the
// one later in the stylesheet wins, not the one later in the attribute.
export const INPUT_BASE =
  'min-h-11 w-full border border-primary/55 bg-background px-3 py-2.5 text-base text-primary transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:min-h-0 sm:py-2 sm:text-sm';
export const INPUT = `mt-1 ${INPUT_BASE}`;
// A field's name, in sentence case at a readable size. It used to be 11px of
// letterspaced capitals at 45% ink — 2.6:1 against the page, under the 4.5:1
// small text needs — and a long label ("Название (англ.) — для страниц /en…")
// ran to three lines of capitals.
// Secondary text elsewhere (hints, counts) is `text-primary/75`: 5:1 on both the
// page and the card colour. Anything lighter fails as small text.
export const LABEL = 'block text-sm font-medium leading-snug text-primary/80 sm:text-[13px]';
export const BTN_SOLID =
  'inline-flex min-h-11 items-center justify-center gap-2 bg-primary px-5 py-2.5 text-xs uppercase tracking-[0.18em] text-background transition-colors hover:bg-accent hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-0';
export const BTN_GHOST =
  'inline-flex min-h-11 items-center justify-center gap-2 border border-primary/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-primary transition-colors hover:border-accent hover:text-accent disabled:opacity-40 sm:min-h-0';
// The ghost button for an action that deletes (asks first, but still deletes).
export const BTN_DANGER =
  'inline-flex min-h-11 items-center justify-center gap-2 border border-danger/45 px-4 py-2 text-xs uppercase tracking-[0.18em] text-danger transition-colors hover:bg-danger/10 disabled:opacity-40 sm:min-h-0';
// Single-glyph controls (⧉ ↑ ↓ ⋯). Square and finger-sized on a phone, back to
// the compact desktop button from `sm:` up.
export const BTN_ICON =
  'inline-flex h-11 w-11 items-center justify-center border border-primary/20 text-base text-primary transition-colors hover:border-accent hover:text-accent disabled:opacity-40 sm:h-auto sm:w-auto sm:px-4 sm:py-2 sm:text-xs sm:uppercase sm:tracking-[0.18em]';
