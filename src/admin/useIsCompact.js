import { useEffect, useState } from 'react';

/**
 * Tailwind's `sm` breakpoint, as a plain number.
 *
 * Most of the admin adapts with CSS alone, but the row actions can't: on a
 * phone they collapse into a popover menu and on desktop they stay a row of
 * buttons, and a popover is not something a media query can produce. Rendering
 * both and hiding one with CSS would put every action in the DOM twice — bad
 * for screen readers and for tests — so the switch is made here instead.
 *
 * Width comes from `window.innerWidth` rather than `matchMedia`: the test setup
 * stubs `matchMedia` to a constant `matches: true` (for prefers-reduced-motion),
 * which would report every test as compact.
 */
export const COMPACT_MAX_WIDTH = 639;

const isCompactWidth = () =>
  typeof window !== 'undefined' && window.innerWidth <= COMPACT_MAX_WIDTH;

export function useIsCompact() {
  const [compact, setCompact] = useState(isCompactWidth);

  useEffect(() => {
    const onResize = () => setCompact(isCompactWidth());
    onResize(); // width may have changed between first render and mount
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return compact;
}
