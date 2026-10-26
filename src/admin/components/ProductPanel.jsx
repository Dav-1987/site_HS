import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { isInStock, productImages, productMedia, resolveImage } from '../../data/catalog.js';
import { IconGift } from '../../components/Gift.jsx';
import { BTN_GHOST } from '../ui.js';
import { giftHint } from '../hints.js';
import { applyUpdate } from '../update.js';
import SidePanel from './SidePanel.jsx';
import Switch from './Switch.jsx';
import VisibilitySelect, { VisibilityNote } from './VisibilitySelect.jsx';
import { StockNote } from './StockToggle.jsx';
import { MainTab, MediaTab, PromoTab, RelatedTab, TextTab } from './ProductTabs.jsx';

/** The tabs, in order. `count` is shown next to the label when it says something. */
const PRODUCT_TABS = [
  { key: 'main', label: 'Основное' },
  { key: 'media', label: 'Фото и видео', count: (p) => productMedia(p).length },
  { key: 'text', label: 'Описание' },
  { key: 'promo', label: 'Акции и подарок' },
  { key: 'related', label: 'Похожие', count: (p) => p.related?.length || 0 },
];

const ICON_BUTTON =
  'flex h-10 w-10 shrink-0 items-center justify-center border border-primary/20 transition-colors hover:border-accent hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent aria-disabled:pointer-events-none aria-disabled:opacity-30';

function Chevron({ up }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path
        d={up ? 'm18 15-6-6-6 6' : 'm6 9 6 6 6-6'}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A link to the previous/next product in the list, or a dead button at the end. */
function Step({ to, up, label }) {
  if (!to) {
    return (
      <span role="link" aria-disabled="true" aria-label={label} className={ICON_BUTTON}>
        <Chevron up={up} />
      </span>
    );
  }
  return (
    <Link
      to={to.href}
      replace
      state={to.state}
      aria-label={`${label}: ${to.label}`}
      className={ICON_BUTTON}
    >
      <Chevron up={up} />
    </Link>
  );
}

/**
 * A product opened from the catalog list: what it is and where it stands up
 * top (photo, name, stock, visibility, gift), the fields in tabs below.
 *
 * `onChange` takes a value or an updater for this product, as every editor's
 * does (see ../update.js); `prev`/`next` are `{ href, label, state }` for the
 * neighbours in the list, so the owner can walk a category without closing.
 */
export default function ProductPanel({
  product,
  category,
  gift,
  // `{ href, label }` from productSiteLink (../siteLink.js) — it needs the
  // whole catalog to name where a switched-off product's address leads.
  siteLink,
  allProducts,
  sheet,
  prev,
  next,
  onClose,
  onChange,
  idError,
  onRename,
  onDuplicate,
  onRemove,
}) {
  // Kept while walking from product to product: someone going through the
  // photos of a whole category wants to land on the photos of the next one.
  const [tab, setTab] = useState('main');
  const titleId = useId();
  const set = (patch) => onChange((p) => ({ ...p, ...applyUpdate(patch, p) }));
  const cover = productImages(product)[0];
  const tabProps = { product, set, allProducts };

  const header = (
    <div className="px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex items-start gap-4">
        <span className="hidden h-[70px] w-14 shrink-0 overflow-hidden bg-surface sm:block">
          {cover && (
            <img src={resolveImage(cover, 200)} alt="" className="h-full w-full object-cover" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="font-serif text-xl font-normal leading-tight sm:text-2xl">
            {product.name || 'Новый товар'}
          </h2>
          <p className="mt-1 text-sm tabular-nums text-secondary">
            {[
              product.reference,
              category.name?.es || category.slug,
              `${productImages(product).length} фото`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Step to={prev} up label="Предыдущий товар" />
          <Step to={next} label="Следующий товар" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть товар"
            className={ICON_BUTTON}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
              className="h-4 w-4"
            >
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  const footer = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
      <button type="button" onClick={onDuplicate} className={BTN_GHOST}>
        Дублировать
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="min-h-11 px-1 text-xs uppercase tracking-[0.18em] text-danger hover:underline sm:min-h-0"
      >
        Удалить товар
      </button>
      <span className="ml-auto hidden text-xs text-primary/75 sm:inline">
        Правки уходят на сайт по кнопке «Сохранить»
      </span>
    </div>
  );

  return (
    <SidePanel sheet={sheet} labelledBy={titleId} onClose={onClose} header={header} footer={footer}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 pt-4 text-sm sm:px-6">
        <Switch checked={isInStock(product)} onChange={(inStock) => set({ inStock })}>
          В наличии
        </Switch>
        <label className="flex items-center gap-2">
          Видимость
          <VisibilitySelect
            value={product.visibility}
            onChange={(visibility) => set({ visibility })}
            title="Видимость товара"
          />
        </label>
        <span className="flex items-center gap-1.5">
          <IconGift className={`h-4 w-4 ${gift ? 'text-promo' : 'text-secondary'}`} />
          Подарок: {gift ? gift.name : 'нет'}
          <span className="text-primary/75">({giftHint(product.gift, true)})</span>
        </span>
        <a
          href={siteLink.href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-accent-text"
        >
          {siteLink.label}
        </a>
      </div>

      <div className="mt-3 space-y-2 px-4 empty:hidden sm:px-6">
        <VisibilityNote entity={product} kind="product" />
        <StockNote product={product} />
      </div>

      {/* Held at the top of the scrolling part, so switching tabs never
          means scrolling back up to them. */}
      <div
        role="tablist"
        aria-label="Разделы товара"
        className="sticky top-0 z-10 mt-3 flex gap-x-5 overflow-x-auto border-b border-primary/15 bg-background px-4 sm:px-6"
      >
        {PRODUCT_TABS.map((t) => {
          const count = t.count?.(product);
          const selected = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`${titleId}-tab-${t.key}`}
              aria-selected={selected}
              aria-controls={`${titleId}-panel`}
              onClick={() => setTab(t.key)}
              className={`min-h-11 shrink-0 whitespace-nowrap border-b-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
                selected
                  ? 'border-primary font-semibold'
                  : 'border-transparent text-primary/75 hover:text-primary'
              }`}
            >
              {/* One text node, so the count is read as part of the tab's name
                  ("Фото и видео 3"), with the space in it. */}
              {count ? `${t.label} ${count}` : t.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${titleId}-panel`}
        aria-labelledby={`${titleId}-tab-${tab}`}
        className="px-4 py-6 sm:px-6"
      >
        {tab === 'main' && (
          <MainTab
            {...tabProps}
            categorySlug={category.slug}
            idError={(newId) => idError(product.id, newId)}
            onRename={(newId) => onRename(product.id, newId)}
            onShowMedia={() => setTab('media')}
          />
        )}
        {tab === 'media' && <MediaTab {...tabProps} />}
        {tab === 'text' && <TextTab {...tabProps} />}
        {tab === 'promo' && <PromoTab {...tabProps} />}
        {tab === 'related' && <RelatedTab {...tabProps} />}
      </div>
    </SidePanel>
  );
}
