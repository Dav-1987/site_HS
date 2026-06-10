import { useState } from 'react';
import { LABEL, BTN_GHOST } from '../ui.js';
import { Field, TextArea } from './Field.jsx';
import ImageField from './ImageField.jsx';
import VideoField from './VideoField.jsx';
import ProductImagesEditor from './ProductImagesEditor.jsx';
import ProductPicker from './ProductPicker.jsx';

export default function ProductEditor({
  product,
  onChange,
  onRemove,
  onMove,
  onDuplicate,
  isFirst,
  isLast,
  allProducts,
}) {
  const [open, setOpen] = useState(false);
  const set = (patch) => onChange({ ...product, ...patch });
  const setMat = (lang, val) => set({ material: { ...product.material, [lang]: val } });
  const setDesc = (lang, val) => set({ description: { ...product.description, [lang]: val } });
  const images = product.images?.length ? product.images : product.image ? [product.image] : [];
  const setImages = (imgs) => set({ images: imgs, image: imgs[0] || '' });

  return (
    <div className="border border-primary/10 bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-3 text-left min-w-0"
        >
          <span className={`shrink-0 text-base transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
          <span className="truncate font-serif text-lg font-light text-primary">
            {product.name || <span className="text-primary/30">Новый товар</span>}
          </span>
          {product.price > 0 && (
            <span className="shrink-0 text-xs text-primary/40">€{product.price}</span>
          )}
        </button>
        <button type="button" onClick={onDuplicate} title="Дублировать товар" className={BTN_GHOST}>⧉</button>
        <button type="button" onClick={() => onMove(-1)} disabled={isFirst} className={BTN_GHOST}>↑</button>
        <button type="button" onClick={() => onMove(1)} disabled={isLast} className={BTN_GHOST}>↓</button>
        <button type="button" onClick={onRemove} title="Удалить товар" className="text-xs uppercase tracking-[0.18em] text-red-600 hover:underline px-2">×</button>
      </div>

      {/* Body */}
      {open && (
        <div className="border-t border-primary/10 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="ID (уникальный)" value={product.id} onChange={(v) => set({ id: v })} />
            <Field label="Название" value={product.name} onChange={(v) => set({ name: v })} />
            <Field label="Размер" value={product.size} onChange={(v) => set({ size: v })} />
            <Field
              label="Цена (€)"
              type="number"
              value={product.price}
              onChange={(v) => set({ price: v === '' ? 0 : Number(v) })}
            />
            <Field
              label="Старая цена (€, для скидки)"
              type="number"
              value={product.oldPrice}
              onChange={(v) => set({ oldPrice: v === '' ? 0 : Number(v) })}
            />
            <div className="hidden lg:block" aria-hidden="true" />
            <Field label="Материал (исп.)" value={product.material?.es} onChange={(v) => setMat('es', v)} />
            <Field label="Материал (англ.)" value={product.material?.en} onChange={(v) => setMat('en', v)} />
          </div>
          <p className="mt-2 text-xs text-primary/40">
            «Старая цена» больше текущей → показывается зачёркнутой рядом с актуальной. 0 — без скидки.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <TextArea
              label="Описание (исп.)"
              value={product.description?.es}
              onChange={(v) => setDesc('es', v)}
            />
            <TextArea
              label="Описание (англ.)"
              value={product.description?.en}
              onChange={(v) => setDesc('en', v)}
            />
          </div>
          <div className="mt-3">
            <ProductImagesEditor images={images} onChange={setImages} />
          </div>
          <div className="mt-3">
            <ImageField
              label="Обложка (мобильные)"
              value={product.imageMobile}
              onChange={(v) => set({ imageMobile: v })}
              frames={[['4 / 5', 'Карточка 4:5']]}
            />
            <p className="mt-2 text-xs leading-relaxed text-primary/40">
              Пусто — на мобильных используется первое фото из галереи.
            </p>
          </div>
          <div className="mt-3">
            <VideoField
              label="Видео товара (идёт последним в галерее после фото)"
              value={product.video}
              onChange={(v) => set({ video: v })}
            />
          </div>
          <div className="mt-3">
            <span className={LABEL}>Похожие товары («You may also like»)</span>
            <p className="mt-1 mb-2 text-xs leading-relaxed text-primary/40">
              Что показывать в блоке на странице этого товара. Пусто — берутся товары
              из этой же категории.
            </p>
            <ProductPicker
              value={product.related || []}
              onChange={(related) => set({ related })}
              allProducts={allProducts}
              excludeId={product.id}
              emptyHint="Пусто — автоматически из этой категории."
            />
          </div>
          <div className="mt-4 flex items-center justify-end border-t border-primary/10 pt-4">
            <button
              type="button"
              onClick={onRemove}
              className="text-xs uppercase tracking-[0.18em] text-red-600 hover:underline"
            >
              Удалить товар
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
