// Every onChange in the admin editors takes either the new value or, like
// React's own setState, a function from the current value to the new one.
//
// The function form is what an upload uses. A file takes seconds to reach the
// server, and the editor stays usable meanwhile; a handler that builds the new
// value from what it saw when the file was picked writes that old picture back
// when the upload lands, undoing every edit made in between — in any product,
// since the root replaces the whole catalog. So each level merges into what it
// is handed (`set = (patch) => onChange((p) => ({ ...p, ...patch }))`) rather
// than into the props it rendered with, and the root applies the chain with a
// functional setState. Then only the patch comes from the moment of the pick,
// and it lands on the state as it is now — even after the card it was picked
// in has been folded away.

/** The value an onChange was handed, resolved against the current one. */
export function applyUpdate(next, current) {
  return typeof next === 'function' ? next(current) : next;
}
