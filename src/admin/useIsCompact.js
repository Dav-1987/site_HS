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

/**
 * Below this width the admin's sidebar gives way to a strip of section links
 * under the toolbar: a 240px sidebar would leave a tablet too little room for
 * the product rows, which want ~800px on desktop.
 */
export const SIDEBAR_MIN_WIDTH = 1024;

const isCompactWidth = (maxWidth) => typeof window !== 'undefined' && window.innerWidth <= maxWidth;

export function useIsCompact(maxWidth = COMPACT_MAX_WIDTH) {
  const [compact, setCompact] = useState(() => isCompactWidth(maxWidth));

  useEffect(() => {
    const onResize = () => setCompact(isCompactWidth(maxWidth));
    onResize(); // width may have changed between first render and mount
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [maxWidth]);

  return compact;
}
