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

/**
 * Applies `next` to one item of a list: the one at `index` if `isIt` confirms
 * it is still there, otherwise wherever `isIt` finds it now.
 *
 * The same lateness again, for the path rather than the value. An upload keeps
 * the place in the list it saw when its file was picked, and by the time it
 * lands the product may have been moved up, or one above it deleted — the place
 * then belongs to a neighbour, and the photo went to it. So the place is only a
 * hint, checked against what the item is called (a product's id, a category's
 * slug). It is still tried first: for anything typed it is always right, and it
 * keeps apart two items that share an id for a moment while one is renamed.
 *
 * When nothing matches — the item was deleted, or renamed, while the upload ran
 * — the list comes back as it was: losing the change beats giving it to another
 * product.
 */
export function updateAt(list, index, isIt, next) {
  const i = index < list.length && isIt(list[index]) ? index : list.findIndex(isIt);
  if (i < 0) return list;
  return list.map((item, j) => (j === i ? applyUpdate(next, item) : item));
}
