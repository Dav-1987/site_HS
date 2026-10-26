import { useState } from 'react';
import { Link } from 'react-router-dom';
import { isInStock, productDiscount, productImages, resolveImage } from '../../data/catalog.js';
import { IconGift } from '../../components/Gift.jsx';
import OverflowMenu, { MenuItem, MenuSeparator } from './OverflowMenu.jsx';
import { VisibilityBadge, VisibilityMenuItems } from './VisibilitySelect.jsx';
import { StockBadge, StockMenuItem } from './StockToggle.jsx';
import Switch from './Switch.jsx';
import { openSiteLink } from '../siteLink.js';

// Columns of the full (desktop, no panel open) row, shared with its header.
const FULL_COLUMNS =
  'grid grid-cols-[40px_28px_56px_minmax(0,1fr)_88px_150px_136px_44px] items-center gap-x-2';

/** The cover photo, or a placeholder, at the row's 4:5. */
function Thumbnail({ product, size = 'h-[55px] w-11' }) {
  const cover = productImages(product)[0];
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden border border-primary/10 bg-surface ${size}`}
    >
      {cover ? (
        <img
          src={resolveImage(cover, 200)}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden="true" className="font-serif text-sm font-light text-primary/40">
          M
        </span>
      )}
    </span>
  );
}

/**
 * The gift this product comes with, resolved by the same productGift() the
 * shop uses (passed in as `gift`), so the mark goes out exactly when the offer
 * leaves the site: switched off, removed, or run out.
 */
function GiftMark({ gift }) {
  if (!gift) return null;
  return (
    <span
      role="img"
      aria-label={`подарок: ${gift.name}`}
      title={`Подарок: ${gift.name}`}
      className="shrink-0 text-promo"
    >
      <IconGift className="h-4 w-4" />
    </span>
  );
}

function PriceLine({ product }) {
  const { onSale, oldPrice, percent } = productDiscount(product);
  if (!onSale) return null;
  return (
    <span className="block text-xs tabular-nums text-secondary">
      <s>{oldPrice} €</s> <span className="font-semibold text-primary">−{percent}%</span>
    </span>
  );
}

function RowMenu({
  product,
  label,
  layout,
  position,
  siteLink,
  onUpdate,
  onMove,
  onDuplicate,
  onRemove,
}) {
  const set = (patch) => onUpdate((p) => ({ ...p, ...patch }));
  return (
    <OverflowMenu title={`Действия с товаром ${label}`}>
      <MenuItem onClick={() => openSiteLink(siteLink)}>{siteLink.label} ↗</MenuItem>
      <MenuSeparator />
      {layout !== 'full' && (
        <StockMenuItem product={product} onChange={(inStock) => set({ inStock })} />
      )}
      <VisibilityMenuItems
        value={product.visibility}
        onChange={(visibility) => set({ visibility })}
      />
      <MenuSeparator />
      <MenuItem onClick={onDuplicate}>Дублировать</MenuItem>
      {position && (
        <>
          <MenuItem onClick={() => onMove(position.index - 1)} disabled={position.first}>
            Переместить выше
          </MenuItem>
          <MenuItem onClick={() => onMove(position.index + 1)} disabled={position.last}>
            Переместить ниже
          </MenuItem>
          <MenuItem onClick={() => onMove(0)} disabled={position.first}>
            В начало списка
          </MenuItem>
          <MenuItem onClick={() => onMove(position.count - 1)} disabled={position.last}>
            В конец списка
          </MenuItem>
        </>
      )}
      <MenuSeparator />
      <MenuItem onClick={onRemove} danger>
        Удалить товар
      </MenuItem>
    </OverflowMenu>
  );
}

function ProductRow({
  row,
  layout,
  showCategory,
  active,
  href,
  gift,
  siteLink,
  position,
  selected,
  onSelect,
  onUpdate,
  onMove,
  onDuplicate,
  onRemove,
  drag,
}) {
  const { product, category } = row;
  const label = product.reference || product.name || 'без названия';
  const name = product.name || <span className="text-primary/75">Новый товар</span>;
  const set = (patch) => onUpdate((p) => ({ ...p, ...patch }));
  const meta = [
    showCategory && (category.name?.es || category.slug),
    product.size,
    `${productImages(product).length} фото`,
  ]
    .filter(Boolean)
    .join(' · ');
  const chips = (
    <>
      <VisibilityBadge entity={product} />
      {layout !== 'full' && <StockBadge product={product} />}
      <GiftMark gift={gift} />
    </>
  );
  const menu = (
    <RowMenu
      product={product}
      label={label}
      layout={layout}
      position={position}
      siteLink={siteLink}
      onUpdate={onUpdate}
      onMove={onMove}
      onDuplicate={onDuplicate}
      onRemove={onRemove}
    />
  );

  // Beside an open product: just enough to recognise each row and pick the
  // next one to open. The row is the link.
  if (layout === 'split') {
    return (
      <li className="border-b border-primary/10">
        <Link
          to={href}
          state={{ fromList: true }}
          aria-current={active ? 'true' : undefined}
          className={`flex min-h-16 items-center gap-3 px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
            active ? 'bg-accent/20' : 'hover:bg-surface'
          }`}
        >
          <Thumbnail product={product} size="h-[45px] w-9" />
          <span className="min-w-0 flex-1">
            <span className={`block truncate ${active ? 'font-semibold' : 'font-medium'}`}>
              {name}
            </span>
            <span className="flex items-center gap-2 text-xs tabular-nums text-primary/75">
              {[product.reference, product.price > 0 && `${product.price} €`]
                .filter(Boolean)
                .join(' · ')}
              {chips}
            </span>
          </span>
        </Link>
      </li>
    );
  }

  if (layout === 'phone') {
    return (
      <li className="flex items-center gap-3 border-b border-primary/10 py-2">
        <Link
          to={href}
          state={{ fromList: true }}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <Thumbnail product={product} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{name}</span>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm tabular-nums">
              {product.reference && <span className="font-semibold">{product.reference}</span>}
              {product.price > 0 && <span className="text-primary/75">{product.price} €</span>}
              {chips}
            </span>
          </span>
        </Link>
        {menu}
      </li>
    );
  }

  return (
    <li
      className={`${FULL_COLUMNS} min-h-[76px] border-b px-1 py-2 transition-colors hover:bg-surface ${
        drag?.over ? 'border-b-primary/10 border-t-2 border-t-accent' : 'border-primary/10'
      } ${drag?.dragging ? 'opacity-40' : ''}`}
      onDragOver={drag?.onDragOver}
      onDrop={drag?.onDrop}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onSelect}
        aria-label={`Выбрать ${label}`}
        className="h-4 w-4 accent-primary"
      />
      {drag ? (
        <button
          type="button"
          draggable
          onDragStart={drag.onDragStart}
          onDragEnd={drag.onDragEnd}
          aria-label={`Перетащить ${label}`}
          title="Перетащите, чтобы поменять порядок"
          className="flex h-8 w-6 cursor-grab items-center justify-center text-secondary hover:text-primary"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4">
            {[5, 12, 19].flatMap((y) =>
              [9, 15].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" />),
            )}
          </svg>
        </button>
      ) : (
        <span />
      )}
      <Thumbnail product={product} />
      <span className="min-w-0 px-2">
        <span className="flex min-w-0 items-center gap-1">
          <Link
            to={href}
            state={{ fromList: true }}
            className="min-w-0 truncate font-medium hover:text-accent-text"
          >
            {name}
          </Link>
          {/* The page on the site, one click from the list. Desktop only: on a
              phone the row is the tap target, and the same link sits in "⋯". */}
          <a
            href={siteLink.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${siteLink.label}: ${label}`}
            title={siteLink.label}
            className="shrink-0 px-1 leading-none text-secondary transition-colors hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span aria-hidden="true">↗</span>
          </a>
        </span>
        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-secondary">
          {meta}
          {chips}
        </span>
      </span>
      <span className="font-semibold tabular-nums">{product.reference}</span>
      <span>
        <span className="flex items-center gap-1.5">
          <input
            type="number"
            min="0"
            value={product.price ?? ''}
            onChange={(e) => set({ price: e.target.value === '' ? 0 : Number(e.target.value) })}
            // The wheel over a focused number field changes the price; let it
            // scroll the page instead (as Field does).
            onWheel={(e) => e.currentTarget.blur()}
            aria-label={`Цена ${label}, €`}
            className="h-9 w-20 border border-primary/30 bg-transparent px-2 text-right tabular-nums focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          €
        </span>
        <PriceLine product={product} />
      </span>
      <Switch checked={isInStock(product)} onChange={(inStock) => set({ inStock })}>
        {isInStock(product) ? 'В наличии' : 'Нет'}
      </Switch>
      {menu}
    </li>
  );
}

/**
 * The catalog's product list. `rows` are `{ product, category }` in the order
 * to show; `layout` is 'full' (desktop), 'split' (beside an open product) or
 * 'phone'. With `reorderable` (one category, nothing searched or filtered — the
 * only view where the rows ARE the order on the site) rows can be dragged and
 * moved from their menu.
 */
export default function ProductList({
  rows,
  layout,
  showCategory,
  reorderable,
  activeId,
  hrefFor,
  giftFor,
  siteLinkFor,
  selected,
  onToggleSelected,
  onToggleAll,
  onUpdate,
  onMove,
  onDuplicate,
  onRemove,
}) {
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);

  const positionOf = (row) => {
    if (!reorderable) return null;
    const { products } = row.category;
    const index = products.findIndex((p) => p.id === row.product.id);
    return {
      index,
      count: products.length,
      first: index === 0,
      last: index === products.length - 1,
    };
  };

  const dragFor = (row) => {
    if (!reorderable || layout !== 'full') return null;
    const { id } = row.product;
    return {
      dragging: dragId === id,
      over: overId === id && dragId !== id,
      onDragStart: (e) => {
        setDragId(id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
      },
      onDragOver: (e) => {
        if (!dragId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (overId !== id) setOverId(id);
      },
      onDrop: (e) => {
        e.preventDefault();
        if (dragId && dragId !== id) onMove(dragId, positionOf(row).index);
        setDragId(null);
        setOverId(null);
      },
      onDragEnd: () => {
        setDragId(null);
        setOverId(null);
      },
    };
  };

  const allSelected = rows.length > 0 && rows.every(({ product }) => selected.has(product.id));

  return (
    <div>
      {layout === 'full' && (
        <div
          className={`${FULL_COLUMNS} min-h-11 border-b border-primary/20 px-1 text-xs text-secondary`}
        >
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => onToggleAll(!allSelected)}
            aria-label="Выбрать все товары в списке"
            className="h-4 w-4 accent-primary"
          />
          <span />
          <span>Фото</span>
          <span className="px-2">Товар</span>
          <span>Артикул</span>
          <span>Цена</span>
          <span>Наличие</span>
          <span />
        </div>
      )}
      <ul>
        {rows.map((row) => {
          const { id } = row.product;
          return (
            <ProductRow
              key={id}
              row={row}
              layout={layout}
              showCategory={showCategory}
              active={id === activeId}
              href={hrefFor(id)}
              gift={giftFor(row.product, row.category)}
              siteLink={siteLinkFor(row.product, row.category)}
              position={positionOf(row)}
              selected={selected.has(id)}
              onSelect={() => onToggleSelected(id)}
              onUpdate={(next) => onUpdate(id, next)}
              onMove={(toIndex) => onMove(id, toIndex)}
              onDuplicate={() => onDuplicate(id)}
              onRemove={() => onRemove(id)}
              drag={dragFor(row)}
            />
          );
        })}
      </ul>
    </div>
  );
}
