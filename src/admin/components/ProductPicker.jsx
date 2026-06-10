import { INPUT, BTN_GHOST } from '../ui.js';

// Ordered multi-select over the whole catalog: pick products (by id) for the
// "Featured" home section or a product's "related" list. Shows the chosen items
// as a reorderable list (↑ ↓ / remove) plus an add dropdown. Stale ids (deleted
// products) still render with their id so they can be removed.
export default function ProductPicker({ value, onChange, allProducts, excludeId, emptyHint }) {
  const ids = Array.isArray(value) ? value : [];
  const labelOf = (id) => {
    const p = allProducts.find((x) => x.id === id);
    return p ? `${p.name} · ${p.categoryName}` : `${id} (удалён?)`;
  };
  const available = allProducts.filter((p) => p.id !== excludeId && !ids.includes(p.id));
  const add = (id) => id && onChange([...ids, id]);
  const remove = (i) => onChange(ids.filter((_, j) => j !== i));
  const move = (i, d) => {
    const t = i + d;
    if (t < 0 || t >= ids.length) return;
    const next = [...ids];
    [next[i], next[t]] = [next[t], next[i]];
    onChange(next);
  };

  return (
    <div>
      <div className="space-y-2">
        {ids.map((id, i) => (
          <div
            key={id}
            className="flex items-center gap-2 border border-primary/10 bg-background px-3 py-2"
          >
            <span className="w-5 shrink-0 text-[11px] text-primary/35">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-sm text-primary">{labelOf(id)}</span>
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className={BTN_GHOST}>
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === ids.length - 1}
              className={BTN_GHOST}
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Убрать"
              className="text-xs uppercase tracking-[0.18em] text-red-600 hover:underline"
            >
              ×
            </button>
          </div>
        ))}
        {ids.length === 0 && <p className="text-sm text-primary/40">{emptyHint}</p>}
      </div>
      <select
        className={`${INPUT} mt-2`}
        value=""
        onChange={(e) => {
          add(e.target.value);
          e.target.value = '';
        }}
        disabled={available.length === 0}
      >
        <option value="">{available.length ? '+ Добавить товар…' : 'Нет доступных товаров'}</option>
        {available.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name || p.id} · {p.categoryName}
          </option>
        ))}
      </select>
    </div>
  );
}
