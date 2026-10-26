import { useEffect, useRef, useState } from 'react';

// Reordering the catalog list on a phone: hold a row still, then drag it.
//
// HTML5 drag-and-drop (the desktop list's handle) never fires on touch, so the
// phone list gets its own gesture on touch events. A row is picked up only
// after the finger has stayed put for HOLD_MS: a finger that moves first is
// scrolling the page, and a short tap still opens the product. Once a row is
// lifted, the list's touchmove listener — registered non-passive up front, or
// browsers would not let it stop the page scrolling — keeps the page still,
// the row follows the finger, and the rows it passes slide aside to open the
// gap it will land in.
//
// The lifted row is moved by writing its transform directly: re-rendering a
// 70-row list on every touchmove stutters on a cheap phone. React state only
// changes when the landing place does.

export const HOLD_MS = 400;
// How far a finger may wander while being held before it counts as a scroll.
const MOVE_TOLERANCE = 8;
// Within this many pixels of the top or bottom of the window the page scrolls
// by itself, so a row can be carried past what fits on the screen.
const EDGE = 64;
const MAX_SCROLL_STEP = 14;

/**
 * Where a row lifted from `from` lands for a finger at `y`, given the vertical
 * middles of every row in list order (`y` and the middles in the same frame).
 * `line` is the gap it goes in — 0 before the first row, `mids.length` after
 * the last — and `toIndex` the row's new index once it is taken out of its old
 * place. `toIndex === from` means no move.
 */
export function reorderTarget(y, mids, from) {
  const line = mids.filter((mid) => mid < y).length;
  return { line, toIndex: line > from ? line - 1 : line };
}

/** Page-scroll speed for a finger at `y` in a window `height` tall (0 = none). */
export function edgeScrollStep(y, height) {
  if (y < EDGE) return -Math.ceil(((EDGE - y) / EDGE) * MAX_SCROLL_STEP);
  if (y > height - EDGE) return Math.ceil(((y - (height - EDGE)) / EDGE) * MAX_SCROLL_STEP);
  return 0;
}

/**
 * How far the row at `index` slides while the row from `from` is held over
 * `toIndex`: the rows between the two move one row-height towards the gap the
 * lifted row left, which opens a gap where it will land.
 */
export function rowShift(index, from, toIndex, height) {
  if (from < toIndex && index > from && index <= toIndex) return -height;
  if (from > toIndex && index >= toIndex && index < from) return height;
  return 0;
}

/**
 * `listRef` goes on the <ul>; `rowProps(id, index)` is spread onto each row's
 * <li>; `rowState(id, index)` tells a row whether it is the lifted one and how
 * far it slides aside (`shift`, px). `onMove(id, toIndex)` is called once, on
 * release, when the row changes place.
 */
export function useTouchReorder({ enabled, onMove }) {
  const listRef = useRef(null);
  const liftRef = useRef(null);
  const onMoveRef = useRef(onMove);
  const suppressClick = useRef(false);
  // { id, from, toIndex, height } — what the rows render from.
  const [drag, setDrag] = useState(null);

  useEffect(() => {
    onMoveRef.current = onMove;
  });

  useEffect(() => {
    const list = listRef.current;
    if (!enabled || !list) return undefined;
    let pending = null;
    let live = null; // the whole drag, kept out of state (see the note above)
    let frame = 0;

    const cancelPending = () => {
      if (pending) clearTimeout(pending.timer);
      pending = null;
    };
    const follow = (clientY) => {
      live.clientY = clientY;
      const y = clientY + window.scrollY;
      live.row.style.transform = `translateY(${y - live.startY}px)`;
      const { toIndex } = reorderTarget(y, live.mids, live.from);
      if (toIndex !== live.toIndex) {
        live.toIndex = toIndex;
        setDrag({ id: live.id, from: live.from, toIndex, height: live.height });
      }
    };
    const scrollLoop = () => {
      if (!live) return;
      const step = edgeScrollStep(live.clientY, window.innerHeight);
      if (step) {
        window.scrollBy(0, step);
        follow(live.clientY);
      }
      frame = requestAnimationFrame(scrollLoop);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      live.row.style.transform = '';
      live = null;
      setDrag(null);
    };

    // Lifting a row: measure every row once, before anything moves — the
    // others stay where they are, so their middles hold for the whole drag.
    liftRef.current = (id, from, x, clientY) => {
      cancelPending();
      pending = {
        x,
        y: clientY,
        timer: setTimeout(() => {
          pending = null;
          const rows = [...list.querySelectorAll('[data-reorder-row]')];
          const mids = rows.map((row) => {
            const r = row.getBoundingClientRect();
            return r.top + window.scrollY + r.height / 2;
          });
          const startY = clientY + window.scrollY;
          const height = rows[from].getBoundingClientRect().height;
          live = { id, from, row: rows[from], mids, startY, clientY, toIndex: from, height };
          setDrag({ id, from, toIndex: from, height });
          try {
            navigator.vibrate?.(15);
          } catch {
            /* not every browser lets a page vibrate */
          }
          frame = requestAnimationFrame(scrollLoop);
        }, HOLD_MS),
      };
    };

    const onTouchMove = (e) => {
      const touch = e.touches[0];
      if (!touch) return;
      if (pending) {
        if (Math.hypot(touch.clientX - pending.x, touch.clientY - pending.y) > MOVE_TOLERANCE) {
          cancelPending();
        }
        return;
      }
      if (!live) return;
      if (e.cancelable) e.preventDefault();
      follow(touch.clientY);
    };
    const onTouchEnd = () => {
      cancelPending();
      if (!live) return;
      const { id, from, toIndex } = live;
      stop();
      // A finger lifted off a link fires a click; this one ended a drag.
      suppressClick.current = true;
      setTimeout(() => (suppressClick.current = false), 600);
      if (toIndex !== from) onMoveRef.current(id, toIndex);
    };
    const onTouchCancel = () => {
      cancelPending();
      if (live) stop();
    };

    list.addEventListener('touchmove', onTouchMove, { passive: false });
    list.addEventListener('touchend', onTouchEnd);
    list.addEventListener('touchcancel', onTouchCancel);
    return () => {
      cancelPending();
      cancelAnimationFrame(frame);
      if (live) live.row.style.transform = '';
      liftRef.current = null;
      list.removeEventListener('touchmove', onTouchMove);
      list.removeEventListener('touchend', onTouchEnd);
      list.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [enabled]);

  const rowProps = (id, index) =>
    enabled
      ? {
          'data-reorder-row': '',
          onTouchStart: (e) => {
            // The row's own "⋯" is a button to tap, not a handle to hold.
            if (e.touches.length !== 1 || e.target.closest?.('button')) return;
            const t = e.touches[0];
            liftRef.current?.(id, index, t.clientX, t.clientY);
          },
          // A long press on a link opens the browser's own menu; here it lifts the row.
          onContextMenu: (e) => e.preventDefault(),
          onClickCapture: (e) => {
            if (!suppressClick.current) return;
            suppressClick.current = false;
            e.preventDefault();
            e.stopPropagation();
          },
        }
      : {};

  const rowState = (id, index) => {
    if (!drag) return null;
    if (drag.id === id) return { lifted: true, shift: 0 };
    return { lifted: false, shift: rowShift(index, drag.from, drag.toIndex, drag.height) };
  };

  return { listRef, rowProps, rowState };
}
