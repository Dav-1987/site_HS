import { STATUS_LABELS } from '../listings.js';

const CONTROL =
  'w-full border border-primary/15 bg-background px-3 py-2.5 text-sm text-primary outline-none transition-colors focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40';

export default function PanelToolbar({ filters, categories, counts, total, onChange }) {
  return (
    <section
      aria-label="Фильтры товаров"
      className="border-y border-primary/10 bg-surface/55 px-4 py-5 md:px-8"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(260px,1fr)_230px_210px]">
        <label>
          <span className="mb-1.5 block text-[10px] uppercase tracking-[0.18em] text-primary/45">
            Поиск
          </span>
          <input
            type="search"
            value={filters.search}
            onChange={(event) => onChange({ search: event.target.value })}
            placeholder="Название, ID или артикул"
            className={CONTROL}
          />
        </label>
        <label>
          <span className="mb-1.5 block text-[10px] uppercase tracking-[0.18em] text-primary/45">
            Категория сайта
          </span>
          <select
            value={filters.category}
            onChange={(event) => onChange({ category: event.target.value })}
            className={CONTROL}
          >
            <option value="all">Все категории</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-[10px] uppercase tracking-[0.18em] text-primary/45">
            Статус
          </span>
          <select
            value={filters.status}
            onChange={(event) => onChange({ status: event.target.value })}
            className={CONTROL}
          >
            <option value="all">Все статусы</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label} — {counts[value] ?? 0}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-4 text-xs text-primary/50">
        Показано {total} товаров · исключённый раздел «Otros Modelos» не импортируется
      </p>
    </section>
  );
}
