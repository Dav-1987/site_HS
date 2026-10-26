import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { VISIBILITY, findProduct, productGift, visibilityOf } from '../../data/catalog.js';
import { useAdmin } from '../useAdmin.js';
import { SPLIT_PANEL_MIN_WIDTH, useIsCompact } from '../useIsCompact.js';
import { CATALOG_FILTERS, catalogRows, filterCounts } from '../catalogView.js';
import { countLabel } from '../plural.js';
import { productSiteLink } from '../siteLink.js';
import { VISIBILITY_LABELS, giftHint } from '../hints.js';
import { BTN_DANGER, BTN_GHOST, BTN_SOLID, INPUT_BASE } from '../ui.js';
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
// The select's value while a search is on: a search looks through every
// category (catalogView.js), so no single one is "selected" then.
const SEARCHING = '?';

const VISIBILITY_TEXT = {
  public: 'показывается на сайте',
  unlisted: 'скрыта из списков',
  off: 'снята с сайта',
};

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
    updateProducts,
    removeProducts,
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
  const siteLinkFor = (product, cat) => productSiteLink(categories, product, cat);
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
  // Bulk actions act on what is ticked AND on screen: a filter can take a
  // ticked row out of sight, and nothing should change where nobody looks.
  const selectedIds = visibleSelected.map(({ product }) => product.id);
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
      siteLink={siteLinkFor(open.product, open.category)}
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
      {/* A select rather than a row of tabs: the row wrapped to two lines on a
          laptop and four on a phone, and most of it is sections that are off
          the site. Their state is spelled out in the option instead. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <label className="flex w-full items-center gap-3 sm:w-auto">
          <span className="shrink-0 text-sm text-secondary">Категория:</span>
          <select
            value={searching ? SEARCHING : category ? category.slug : ALL}
            onChange={(e) => {
              setSearch('');
              changeView({ cat: e.target.value, q: null });
            }}
            className={`${INPUT_BASE} min-w-0 flex-1 sm:w-80 sm:flex-none`}
          >
            {searching && (
              <option value={SEARCHING} disabled>
                Поиск по всему каталогу
              </option>
            )}
            <option value={ALL}>
              Все товары — {categories.reduce((n, c) => n + c.products.length, 0)}
            </option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {[
                  `${c.name?.es || c.slug} — ${c.products.length}`,
                  visibilityOf(c) !== 'public' && VISIBILITY_TEXT[visibilityOf(c)],
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={onAddCategory} className={BTN_GHOST}>
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
          <label
            key={f.key}
            title={f.title}
            className="flex min-h-11 cursor-pointer items-center gap-2 sm:min-h-0"
          >
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

          {/* ─── bulk actions ─── */}
          {visibleSelected.length > 0 && (
            <BulkBar
              count={visibleSelected.length}
              categories={categories}
              onMove={(toSlug) => {
                moveProductsTo(selectedIds, toSlug);
                setSelected(new Set());
              }}
              // The selection stays: setting visibility and stock are often
              // done together, and neither takes the rows out of a plain list.
              onSet={(patch) => updateProducts(selectedIds, (p) => ({ ...p, ...patch }))}
              onRemove={() => {
                if (!removeProducts(selectedIds)) return;
                if (selectedIds.includes(productId)) closePanel();
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
                  siteLinkFor={siteLinkFor}
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

const STOCK_OPTIONS = { in: 'В наличии', out: 'Нет в наличии' };

/**
 * A select that acts the moment an option is picked and goes back to its
 * placeholder — for settings applied to the whole selection, where a separate
 * "apply" button would only add a click. Nothing reaches the site before
 * «Сохранить» anyway.
 */
function ApplySelect({ label, placeholder, options, onPick }) {
  return (
    <label className="w-full sm:w-44">
      <span className="sr-only">{label}</span>
      <select
        value=""
        onChange={(e) => e.target.value && onPick(e.target.value)}
        className={INPUT_BASE}
      >
        <option value="">{placeholder}</option>
        {Object.entries(options).map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function BulkBar({ count, categories, onMove, onSet, onRemove, onClear }) {
  const [target, setTarget] = useState('');
  // Two rows rather than one long wrapping one: what is selected and the ways
  // out of it on top, what to do with it below.
  return (
    <div className="mt-4 space-y-3 border border-accent bg-accent/10 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="mr-auto text-sm font-semibold">Выбрано: {count}</span>
        <button type="button" onClick={onRemove} className={BTN_DANGER}>
          Удалить выбранные
        </button>
        <button type="button" onClick={onClear} className={BTN_GHOST}>
          Снять выбор
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex w-full gap-3 sm:w-auto">
          <label className="min-w-0 flex-1 sm:w-48 sm:flex-none">
            <span className="sr-only">Переместить в категорию</span>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className={INPUT_BASE}
            >
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
            Переместить
          </button>
        </div>
        <ApplySelect
          label="Видимость выбранных"
          placeholder="Видимость…"
          options={Object.fromEntries(VISIBILITY.map((v) => [v, VISIBILITY_LABELS[v]]))}
          onPick={(visibility) => onSet({ visibility })}
        />
        <ApplySelect
          label="Наличие выбранных"
          placeholder="Наличие…"
          options={STOCK_OPTIONS}
          onPick={(stock) => onSet({ inStock: stock === 'in' })}
        />
      </div>
    </div>
  );
}
