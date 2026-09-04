import { BTN_ICON } from '../ui.js';
import { useIsCompact } from '../useIsCompact.js';
import OverflowMenu, { MenuItem, MenuSeparator } from './OverflowMenu.jsx';

/**
 * The duplicate / move / delete controls of a category or product row.
 *
 * On desktop they stay the row of buttons they have always been. On a phone
 * that row is what pushed the panel to twice the screen width, so there they
 * collapse into a single "⋯" menu — which also gives the destructive "delete"
 * a full-width label instead of a 25×16px "×" sitting next to "↓".
 *
 * `extras` are menu items shown ONLY in the compact menu — the state controls
 * (visibility, stock) that keep their own inline widgets on desktop.
 */
export default function RowActions({
  labels,
  isFirst,
  isLast,
  onDuplicate,
  onMove,
  onRemove,
  extras,
}) {
  const compact = useIsCompact();

  if (compact) {
    return (
      <OverflowMenu title={labels.more}>
        {extras}
        {extras && <MenuSeparator />}
        <MenuItem onClick={onDuplicate}>⧉ {labels.duplicate}</MenuItem>
        <MenuItem onClick={() => onMove(-1)} disabled={isFirst}>
          ↑ {labels.up}
        </MenuItem>
        <MenuItem onClick={() => onMove(1)} disabled={isLast}>
          ↓ {labels.down}
        </MenuItem>
        <MenuSeparator />
        <MenuItem onClick={onRemove} danger>
          × {labels.remove}
        </MenuItem>
      </OverflowMenu>
    );
  }

  return (
    <>
      <button type="button" onClick={onDuplicate} title={labels.duplicate} className={BTN_ICON}>
        ⧉
      </button>
      <button
        type="button"
        onClick={() => onMove(-1)}
        disabled={isFirst}
        title={labels.up}
        className={BTN_ICON}
      >
        ↑
      </button>
      <button
        type="button"
        onClick={() => onMove(1)}
        disabled={isLast}
        title={labels.down}
        className={BTN_ICON}
      >
        ↓
      </button>
      <button
        type="button"
        onClick={onRemove}
        title={labels.remove}
        className="px-2 text-xs uppercase tracking-[0.18em] text-red-600 hover:underline"
      >
        ×
      </button>
    </>
  );
}
