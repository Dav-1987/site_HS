import { useMemo, useState } from 'react';
import { WALLAPOP_CATEGORY_MAP } from '../wallapop/categories.js';
import { panelRecords } from '../wallapop/listings.js';
import PanelToolbar from '../wallapop/components/PanelToolbar.jsx';
import ProductCard from '../wallapop/components/ProductCard.jsx';
import { useWallapopPanel } from '../wallapop/useWallapopPanel.js';

const INITIAL_FILTERS = { search: '', category: 'all', status: 'all' };

export default function WallapopPanel() {
  const { state, loadingError, saveStatus, updateRecord } = useWallapopPanel();
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const records = useMemo(() => panelRecords(state), [state]);

  const counts = useMemo(
    () =>
      records.reduce(
        (result, record) => ({ ...result, [record.status]: result[record.status] + 1 }),
        { not_published: 0, published: 0, sold: 0 },
      ),
    [records],
  );

  const categories = useMemo(() => {
    const seen = new Map();
    records.forEach((record) => {
      seen.set(record.siteCategorySlug, record.siteCategoryName);
    });
    return [...seen].map(([slug, name]) => ({ slug, name }));
  }, [records]);

  const filtered = useMemo(() => {
    const query = filters.search.trim().toLocaleLowerCase('es');
    return records.filter((record) => {
      if (filters.category !== 'all' && record.siteCategorySlug !== filters.category) return false;
      if (filters.status !== 'all' && record.status !== filters.status) return false;
      if (!query) return true;
      return [record.titleEs, record.productId, record.reference, record.siteCategoryName]
        .join(' ')
        .toLocaleLowerCase('es')
        .includes(query);
    });
  }, [filters, records]);

  if (loadingError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <div>
          <h1 className="font-serif text-4xl font-light">Панель Wallapop недоступна</h1>
          <p className="mt-4 text-sm text-danger">{loadingError}</p>
          <p className="mt-2 text-sm text-primary/50">
            Запустите панель через локальный режим проекта.
          </p>
        </div>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-primary/45">
        Подготавливаем локальные товары…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-20 text-primary">
      <header className="px-5 pb-10 pt-12 md:px-10 md:pb-14 md:pt-16 xl:px-16">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.25em] text-accent-text">
              Локальная подготовка объявлений
            </p>
            <h1 className="font-serif text-5xl font-light leading-none tracking-tight md:text-7xl">
              Wallapop
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-primary/60">
              Испанские тексты, фотографии и статусы для ручной публикации. Панель ничего не
              публикует и не заполняет на Wallapop автоматически.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:min-w-[430px]">
            <div className="border border-primary/10 bg-surface/55 p-4">
              <div className="font-serif text-3xl">{counts.not_published}</div>
              <div className="mt-1 text-[9px] uppercase tracking-[0.14em] text-primary/40">
                Не опубликовано
              </div>
            </div>
            <div className="border border-accent/35 bg-accent/10 p-4">
              <div className="font-serif text-3xl">{counts.published}</div>
              <div className="mt-1 text-[9px] uppercase tracking-[0.14em] text-primary/40">
                Опубликовано
              </div>
            </div>
            <div className="border border-sale/35 bg-sale/10 p-4">
              <div className="font-serif text-3xl">{counts.sold}</div>
              <div className="mt-1 text-[9px] uppercase tracking-[0.14em] text-primary/40">
                Продано
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-primary/10 pt-4 text-[10px] uppercase tracking-[0.16em] text-primary/40">
          <span>Локальный файл · local-data/wallapop-panel.json</span>
          <span aria-live="polite" className={saveStatus === 'error' ? 'text-danger' : ''}>
            {saveStatus === 'saving' && 'Сохраняем…'}
            {saveStatus === 'saved' && 'Все изменения сохранены'}
            {saveStatus === 'error' && 'Ошибка сохранения'}
          </span>
        </div>
      </header>

      <PanelToolbar
        filters={filters}
        categories={categories}
        counts={counts}
        total={filtered.length}
        onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
      />

      <details className="mx-5 mt-6 border border-primary/10 bg-surface/35 md:mx-10 xl:mx-16">
        <summary className="cursor-pointer px-5 py-4 text-xs uppercase tracking-[0.16em] text-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          Сопоставление категорий
        </summary>
        <div className="grid gap-px border-t border-primary/10 bg-primary/10 md:grid-cols-2 xl:grid-cols-4">
          {Object.entries(WALLAPOP_CATEGORY_MAP).map(([slug, mapping]) => (
            <div key={slug} className="bg-background p-5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-primary/40">{slug}</p>
              <p className="mt-2 text-sm leading-relaxed">
                {mapping.category} → {mapping.section} → {mapping.type}
              </p>
            </div>
          ))}
        </div>
      </details>

      <section aria-label="Товары для Wallapop" className="px-5 pt-8 md:px-10 xl:px-16">
        {filtered.length ? (
          <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
            {filtered.map((record) => (
              <ProductCard key={record.productId} record={record} onUpdate={updateRecord} />
            ))}
          </div>
        ) : (
          <div className="border border-primary/10 py-24 text-center text-sm text-primary/45">
            По выбранным фильтрам товаров нет.
          </div>
        )}
      </section>
    </main>
  );
}
