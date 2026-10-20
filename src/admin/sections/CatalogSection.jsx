import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { findProduct, productGift, visibilityOf } from '../../data/catalog.js';
import { useAdmin } from '../useAdmin.js';
import { SPLIT_PANEL_MIN_WIDTH, useIsCompact } from '../useIsCompact.js';
import { CATALOG_FILTERS, catalogRows, filterCounts } from '../catalogView.js';
import { countLabel } from '../plural.js';
import { giftHint } from '../hints.js';
import { BTN_GHOST, BTN_SOLID, INPUT_BASE } from '../ui.js';
import ProductList from '../components/ProductList.jsx';
import SearchBox from '../components/SearchBox.jsx';
import ProductPanel from '../components/ProductPanel.jsx';
import CategoryPanel from '../components/CategoryPanel.jsx';
import SectionPending from './SectionPending.jsx';

// What the list shows lives in the address — `?cat=` category (`*` = all),
// `q=` search, `f=` filters, `product=` the open product, `edit=category` the
// open category settings — so a reload keeps it, a product can be linked to,
// and the browser's Back closes what was just opened.
const ALL = '*';

const VISIBILITY_TEXT = {
  public: 'показывается на сайте',
  unlisted: 'скрыта из списков',
  off: 'снята с сайта',
};

function EyeOff() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      role="img"
      aria-label="скрыта из списков"
      className="h-4 w-4 shrink-0"
    >
      <path d="M10.73 5.08A10.74 10.74 0 0 1 21.94 11.65a1 1 0 0 1 0 .7 10.75 10.75 0 0 1-1.44 2.49" />
      <path d="M14.08 14.16a3 3 0 0 1-4.24-4.24" />
      <path d="M17.48 17.5a10.75 10.75 0 0 1-15.42-5.15 1 1 0 0 1 0-.7 10.75 10.75 0 0 1 4.45-5.14" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

const TAB =
  'inline-flex min-h-10 items-center gap-2 border px-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

/** Каталог: search, categories, filters, the product list and a side panel. */
export default function CatalogSection() {
  const { editor } = useAdmin();
  const {
    categories,
    loadError,
    allProducts,
    setShowHistory,
    updateProduct,
    addProduct,
    duplicateProduct,
    removeProduct,
    moveProduct,
    moveProductsTo,
    productIdError,
    renameProduct,
    updateCategory,
    addCategory,
    duplicateCategory,
    removeCategory,
    moveCategory,
    categorySlugError,
    renameCategory,
  } = editor;
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [selected, setSelected] = useState(() => new Set());
  // The search box answers to its own state, and the address follows it. Read
  // back from the address, every keystroke would wait for the navigation that
  // carries it — React Router applies those as transitions — and fast typing
  // lost all but the last letter.
  const [search, setSearch] = useState(() => params.get('q') ?? '');
  const phone = useIsCompact();
  const sheet = useIsCompact(SPLIT_PANEL_MIN_WIDTH - 1);

  if (!categories) return <SectionPending error={loadError} />;

  const query = search;
  const filters = (params.get('f') ?? '').split(',').filter(Boolean);
  const searching = Boolean(query.trim());
  const requested = params.get('cat');
  const category =
    requested === ALL ? null : (categories.find((c) => c.slug === requested) ?? categories[0]);
  const slug = category?.slug ?? '';
  const rows = catalogRows(categories, { slug, query, filters });
  const counts = filterCounts(categories, { slug, query });
  const reorderable = Boolean(category) && !searching && !filters.length;

  const productId = params.get('product');
  const open = productId ? findProduct(categories, productId) : null;
  const editingCategory = params.get('edit') === 'category' && category && !open;
  const panelOpen = Boolean(open || editingCategory);
  const layout = phone ? 'phone' : panelOpen && !sheet ? 'split' : 'full';

  // ─── navigation ────────────────────────────────────────────────────────────
  const withParams = (changes) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
    }
    return next;
  };
  const hrefFor = (id) => `?${withParams({ product: id, edit: null })}`;
  // A view change starts a new selection: what was ticked is out of sight.
  const changeView = (changes) => {
    setSelected(new Set());
    setParams(withParams({ ...changes, product: null, edit: null }), { replace: true });
  };
  const openPanel = (changes) =>
    navigate({ search: `?${withParams(changes)}` }, { state: { fromList: true } });
  const closePanel = () => {
    // Opened from this list: going back is closing, and keeps Back honest.
    if (location.state?.fromList) navigate(-1);
    else setParams(withParams({ product: null, edit: null }), { replace: true });
  };
  const toggleFilter = (key) =>
    changeView({
      f: (filters.includes(key) ? filters.filter((k) => k !== key) : [...filters, key]).join(','),
    });

  // ─── actions ───────────────────────────────────────────────────────────────
  const giftFor = (product, cat) => productGift(categories, product, cat, 'es');
  const onAddProduct = () => openPanel({ product: addProduct(slug), edit: null });
  const onDuplicate = (id) => {
    const copy = duplicateProduct(id);
    if (copy) openPanel({ product: copy, edit: null });
  };
  const onRemove = (id) => {
    if (removeProduct(id) && id === productId) closePanel();
  };
  const onRenameProduct = (oldId, newId) => {
    renameProduct(oldId, newId);
    setParams(withParams({ product: newId }), { replace: true, state: location.state });
  };
  const onAddCategory = () => {
    setSelected(new Set());
    setSearch('');
    openPanel({ cat: addCategory(), q: null, f: null, product: null, edit: 'category' });
  };

  const visibleSelected = rows.filter(({ product }) => selected.has(product.id));
  const toggleSelected = (id) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // ─── the open product's neighbours ────────────────────────────────────────
  const at = open ? rows.findIndex(({ product }) => product.id === open.product.id) : -1;
  const neighbour = (i) =>
    at >= 0 && rows[i]
      ? {
          href: hrefFor(rows[i].product.id),
          label: rows[i].product.reference || rows[i].product.name,
          state: location.state,
        }
      : null;

  // ─── header of the list ───────────────────────────────────────────────────
  let heading;
  let summary;
  if (searching) {
    heading = `Поиск: «${query.trim()}»`;
    summary = `Найдено: ${rows.length} — во всём каталоге`;
  } else if (category) {
    heading = category.name?.es || category.slug;
    summary = [
      countLabel(category.products.length, ['товар', 'товара', 'товаров']),
      VISIBILITY_TEXT[visibilityOf(category)],
      `подарок: ${giftHint(category.gift, false)}`,
    ].join(' · ');
  } else {
    heading = 'Все товары';
    summary = `${countLabel(
      categories.reduce((n, c) => n + c.products.length, 0),
      ['товар', 'товара', 'товаров'],
    )} в ${countLabel(categories.length, ['категории', 'категориях', 'категориях'])}`;
  }

  const panel = open ? (
    <ProductPanel
      key="product"
      product={open.product}
      category={open.category}
      gift={giftFor(open.product, open.category)}
      allProducts={allProducts}
      sheet={sheet}
      prev={neighbour(at - 1)}
      next={neighbour(at + 1)}
      onClose={closePanel}
      onChange={(next) => updateProduct(open.product.id, next)}
      idError={productIdError}
      onRename={onRenameProduct}
      onDuplicate={() => onDuplicate(open.product.id)}
      onRemove={() => onRemove(open.product.id)}
    />
  ) : editingCategory ? (
    <CategoryPanel
      key="category"
      category={category}
      allProducts={allProducts}
      sheet={sheet}
      isFirst={categories[0] === category}
      isLast={categories.at(-1) === category}
      onClose={closePanel}
      onChange={(next) => updateCategory(category.slug, next)}
      slugError={(newSlug) => categorySlugError(category.slug, newSlug)}
      onRename={(newSlug) => {
        renameCategory(category.slug, newSlug);
        setParams(withParams({ cat: newSlug }), { replace: true, state: location.state });
      }}
      onMove={(dir) => moveCategory(category.slug, dir)}
      onDuplicate={() => {
        const copy = duplicateCategory(category.slug);
        if (copy) setParams(withParams({ cat: copy }), { replace: true, state: location.state });
      }}
      onRemove={() => {
        if (removeCategory(category.slug)) {
          setParams(withParams({ cat: null, edit: null }), { replace: true });
        }
      }}
    />
  ) : null;

  return (
    <div className="space-y-5">
      {/* ─── search ─── */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox
          label="Поиск по товарам"
          value={query}
          onChange={(value) => {
            setSearch(value);
            changeView({ q: value });
          }}
          placeholder="Название, артикул или ID — например, L-06"
          className="flex-1 basis-72 lg:max-w-2xl"
        />
        <button type="button" onClick={() => setShowHistory(true)} className={BTN_GHOST}>
          История изменений
        </button>
      </div>

      {/* ─── categories ─── */}
      <div role="group" aria-label="Категория" className="flex flex-wrap gap-2">
        {[{ slug: ALL, name: 'Все', count: categories.reduce((n, c) => n + c.products.length, 0) }]
          .concat(
            categories.map((c) => ({
              slug: c.slug,
              name: c.name?.es || c.slug,
              count: c.products.length,
              hidden: visibilityOf(c) !== 'public',
            })),
          )
          .map((t) => {
            const pressed = !searching && (t.slug === ALL ? !category : t.slug === slug);
            return (
              <button
                key={t.slug}
                type="button"
                aria-pressed={pressed}
                onClick={() => {
                  setSearch('');
                  changeView({ cat: t.slug, q: null });
                }}
                className={`${TAB} ${
                  pressed
                    ? 'border-primary bg-primary font-semibold text-background'
                    : 'border-primary/30 hover:border-primary'
                }`}
              >
                {t.name}{' '}
                <span
                  className={`tabular-nums ${pressed ? 'font-normal opacity-80' : 'text-secondary'}`}
                >
                  {t.count}
                </span>
                {t.hidden && <EyeOff />}
              </button>
            );
          })}
        <button
          type="button"
          onClick={onAddCategory}
          className={`${TAB} border-dashed border-primary/45 hover:border-primary`}
        >
          + Категория
        </button>
      </div>

      {/* ─── filters ─── */}
      <fieldset className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <legend className="sr-only">Фильтры</legend>
        <span aria-hidden="true" className="text-secondary">
          Показать только:
        </span>
        {CATALOG_FILTERS.map((f) => (
          <label key={f.key} className="flex min-h-11 cursor-pointer items-center gap-2 sm:min-h-0">
            <input
              type="checkbox"
              checked={filters.includes(f.key)}
              onChange={() => toggleFilter(f.key)}
              className="h-4 w-4 accent-primary"
            />
            {f.label} <span className="tabular-nums text-secondary">{counts[f.key]}</span>
          </label>
        ))}
      </fieldset>

      <div
        className={
          layout === 'split'
            ? 'grid grid-cols-[minmax(340px,1fr)_minmax(0,1.55fr)] items-start gap-6'
            : ''
        }
      >
        <section aria-labelledby="catalog-list-heading" className="min-w-0">
          {/* ─── what is listed ─── */}
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3 border-b border-primary/20 pb-4">
            <div className="min-w-0 flex-1 basis-60">
              <h2
                id="catalog-list-heading"
                className="font-serif text-2xl font-normal leading-tight"
              >
                {heading}
              </h2>
              <p className="mt-1 text-sm text-secondary">{summary}</p>
            </div>
            {searching && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  changeView({ q: null });
                }}
                className={BTN_GHOST}
              >
                Сбросить поиск
              </button>
            )}
            {category && !searching && (
              <>
                <button
                  type="button"
                  onClick={() => openPanel({ edit: 'category', product: null })}
                  className={BTN_GHOST}
                >
                  Настройки категории
                </button>
                <button type="button" onClick={onAddProduct} className={BTN_GHOST}>
                  + Добавить товар
                </button>
              </>
            )}
          </div>

          {/* ─── bulk move ─── */}
          {visibleSelected.length > 0 && (
            <BulkBar
              count={visibleSelected.length}
              categories={categories}
              onMove={(toSlug) => {
                moveProductsTo(
                  visibleSelected.map(({ product }) => product.id),
                  toSlug,
                );
                setSelected(new Set());
              }}
              onClear={() => setSelected(new Set())}
            />
          )}

          {rows.length > 0 ? (
            <div className={layout === 'full' ? 'overflow-x-auto' : ''}>
              <div className={layout === 'full' ? 'min-w-[760px]' : ''}>
                <ProductList
                  rows={rows}
                  layout={layout}
                  showCategory={!category || searching}
                  reorderable={reorderable}
                  activeId={open?.product.id}
                  hrefFor={hrefFor}
                  giftFor={giftFor}
                  selected={selected}
                  onToggleSelected={toggleSelected}
                  onToggleAll={(all) =>
                    setSelected(all ? new Set(rows.map(({ product }) => product.id)) : new Set())
                  }
                  onUpdate={updateProduct}
                  onMove={moveProduct}
                  onDuplicate={onDuplicate}
                  onRemove={onRemove}
                />
              </div>
            </div>
          ) : (
            <div className="py-10 text-sm">
              {searching || filters.length ? (
                <>
                  <p className="text-primary/75">Ничего не нашлось.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      changeView({ q: null, f: null });
                    }}
                    className={`${BTN_GHOST} mt-3`}
                  >
                    Сбросить поиск и фильтры
                  </button>
                </>
              ) : (
                <>
                  <p className="text-primary/75">В этой категории пока нет товаров.</p>
                  {category && (
                    <button type="button" onClick={onAddProduct} className={`${BTN_SOLID} mt-3`}>
                      + Добавить товар
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {rows.length > 0 && layout === 'full' && (
            <p className="mt-3 text-xs text-primary/75">
              {reorderable
                ? 'Порядок строк — это порядок на сайте: перетащите товар за ручку слева или выберите место в меню «⋯».'
                : 'Порядок меняется в списке одной категории, без поиска и фильтров.'}
            </p>
          )}
        </section>

        {panel}
      </div>
    </div>
  );
}

function BulkBar({ count, categories, onMove, onClear }) {
  const [target, setTarget] = useState('');
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 border border-accent bg-accent/10 px-4 py-3">
      <span className="text-sm font-semibold">Выбрано: {count}</span>
      <label className="flex-1 basis-48 sm:max-w-xs">
        <span className="sr-only">Переместить в категорию</span>
        <select value={target} onChange={(e) => setTarget(e.target.value)} className={INPUT_BASE}>
          <option value="">Переместить в…</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name?.es || c.slug}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={!target}
        onClick={() => {
          onMove(target);
          setTarget('');
        }}
        className={BTN_SOLID}
      >
        Переместить выбранные
      </button>
      <button type="button" onClick={onClear} className={BTN_GHOST}>
        Снять выбор
      </button>
    </div>
  );
}
