import { useState } from 'react';
import { orderHomeCatalogProducts, productImages, resolveImage } from '../../data/catalog.js';
import { useTouchReorder } from '../useTouchReorder.js';

const MOVE_BUTTON =
  'inline-flex h-11 w-11 items-center justify-center border border-primary/20 text-sm text-primary transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 sm:h-9 sm:w-9';

/** Order the selected homepage products without moving them in their categories. */
export default function HomeCatalogOrderEditor({ products, order, onChange }) {
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const ordered = orderHomeCatalogProducts(products, order);
  const moveTo = (id, toIndex) => {
    onChange((current) => {
      const ids = orderHomeCatalogProducts(products, current).map((product) => product.id);
      const index = ids.indexOf(id);
      const target = Math.max(0, Math.min(toIndex, ids.length - 1));
      if (index < 0 || target === index) return current;
      ids.splice(index, 1);
      ids.splice(target, 0, id);
      return ids;
    });
  };
  const touch = useTouchReorder({ enabled: true, onMove: moveTo });

  if (!ordered.length) {
    return <p className="text-sm text-primary/75">Пока нет товаров для этого блока.</p>;
  }

  return (
    <div>
      <p className="mb-3 text-xs leading-relaxed text-primary/75">
        Перетащите товар за ручку; на телефоне удерживайте строку и двигайте её. Стрелки меняют
        порядок по одному шагу. В категориях товары останутся на своих местах.
      </p>
      <ol
        ref={touch.listRef}
        className="space-y-2"
        aria-label="Порядок товаров каталога на главной"
      >
        {ordered.map((product, index) => {
          const cover = productImages(product)[0];
          const label = product.reference || product.name || product.id;
          const lifted = touch.rowState(product.id, index);
          return (
            <li
              key={product.id}
              {...touch.rowProps(product.id, index)}
              onDragOver={(event) => {
                if (!dragId) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setOverId(product.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragId) moveTo(dragId, index);
                setDragId(null);
                setOverId(null);
              }}
              style={
                lifted && !lifted.lifted
                  ? { transform: `translateY(${lifted.shift}px)` }
                  : undefined
              }
              className={`grid grid-cols-[1.25rem_2.75rem_minmax(0,1fr)_2.75rem] select-none items-center gap-2 border bg-background p-3 [-webkit-touch-callout:none] sm:flex sm:gap-3 ${
                overId === product.id ? 'border-accent' : 'border-primary/15'
              } ${lifted?.lifted ? 'relative z-10 shadow-floating' : ''} ${
                lifted && !lifted.lifted ? 'transition-transform duration-150 ease-out' : ''
              } ${dragId === product.id ? 'opacity-50' : ''}`}
            >
              <div className="flex w-5 shrink-0 flex-col items-center gap-1">
                <span className="text-xs tabular-nums text-primary/75">{index + 1}</span>
                <span
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', product.id);
                    setDragId(product.id);
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverId(null);
                  }}
                  title="Перетащить товар"
                  aria-hidden="true"
                  className="cursor-grab select-none text-sm leading-none text-primary/75 active:cursor-grabbing"
                >
                  ⠿
                </span>
              </div>
              <div className="h-14 w-11 shrink-0 overflow-hidden bg-surface">
                {cover && (
                  <img
                    src={resolveImage(cover, 120)}
                    alt=""
                    draggable={false}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 sm:flex-1">
                <p className="truncate text-sm font-medium" title={product.name}>
                  {product.name || label}
                </p>
                <p className="truncate text-xs text-primary/75">
                  {[product.reference, product.category?.es].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex flex-col gap-1 sm:ml-auto sm:flex-row sm:gap-2">
                <button
                  type="button"
                  onClick={() => moveTo(product.id, index - 1)}
                  disabled={index === 0}
                  aria-label={`Поднять ${label}`}
                  className={MOVE_BUTTON}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveTo(product.id, index + 1)}
                  disabled={index === ordered.length - 1}
                  aria-label={`Опустить ${label}`}
                  className={MOVE_BUTTON}
                >
                  ↓
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
