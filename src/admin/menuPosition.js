// Where an OverflowMenu popover goes (see components/OverflowMenu.jsx). Kept
// out of the component file so that file exports components only.

// Room kept between the popover and the trigger, and between it and the edges
// of the window.
const GAP = 4;
const EDGE = 8;

/**
 * Where the popover goes, in window coordinates: below the trigger, or above
 * it when there is no room below and more above; its right edge on the
 * trigger's (`align` 'left': its left edge). Whatever would stick out of the
 * window is slid back in — on a phone a row's menu is taller than the room on
 * either side of its button, and then it covers the button rather than run off
 * the screen. `maxHeight` caps one taller than the whole window, which then
 * scrolls inside.
 */
export function menuPosition(trigger, menu, viewport, align = 'right') {
  const below = viewport.height - trigger.bottom - GAP - EDGE;
  const above = trigger.top - GAP - EDGE;
  const preferred =
    menu.height > below && above > below ? trigger.top - GAP - menu.height : trigger.bottom + GAP;
  const top = Math.max(EDGE, Math.min(preferred, viewport.height - menu.height - EDGE));
  const wanted = align === 'left' ? trigger.left : trigger.right - menu.width;
  const left = Math.max(EDGE, Math.min(wanted, viewport.width - menu.width - EDGE));
  return { top, left, maxHeight: viewport.height - 2 * EDGE };
}
