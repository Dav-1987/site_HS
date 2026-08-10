import { useState } from 'react';
import { BTN_GHOST } from '../ui.js';
import { Field, Select, TextArea } from './Field.jsx';
import { urlSafe } from '../urlSafe.js';
import {
  DEFAULT_PERK_VARIANT,
  PERK_VARIANTS,
  productMedia,
  productPerkVariant,
  resolveImage,
} from '../../data/catalog.js';
import { translations } from '../../i18n/translations.js';
import ImageField from './ImageField.jsx';
import ProductImagesEditor from './ProductImagesEditor.jsx';
import ProductPicker from './ProductPicker.jsx';

// Only the third perk of the strip differs between variants, so the dropdown is
// labelled with that perk's Spanish text — read straight from the translations
// so the two can't drift apart.
const PERK_OPTIONS = PERK_VARIANTS.map((value) => ({
  value,
  label:
    translations.es[`order.perk.${value}`] +
    (value === DEFAULT_PERK_VARIANT ? ' — по умолчанию' : ''),
}));

function SectionLabel({ children }) {
  return (
    <div className="mt-5 mb-2 border-t border-primary/10 pt-4 text-xs font-medium uppercase tracking-[0.22em] text-accent-text first:mt-0 first:border-t-0 first:pt-0">
      {children}
    </div>
  );
}

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
  // Unified ordered media (photos + videos). Keep the legacy cover fields
  // (`image`/`images`) in sync so the catalog card, OG image and Schema.org —
  // all photo-only — stay correct without a separate save step.
  const media = productMedia(product);
  // First photo = the catalog cover (same rule as ProductImagesEditor).
  const cover = media.find((m) => m.type === 'image')?.src;
  const setMedia = (next) => {
    const photos = next.filter((m) => m.type === 'image').map((m) => m.src);
    set({ media: next, image: photos[0] || '', images: photos, video: '', videoFirst: false });
  };

  return (
    <div className="border border-primary/10 bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-3 text-left min-w-0"
        >
          <span className={`shrink-0 text-base transition-transform ${open ? 'rotate-45' : ''}`}>
            +
          </span>
          <span className="truncate font-serif text-lg font-light text-primary">
            {product.name || <span className="text-primary/30">Новый товар</span>}
            {product.subtitle && (
              <span className="ml-2 text-sm text-primary/40">{product.subtitle}</span>
            )}
          </span>
          {product.reference && (
            <span className="shrink-0 text-sm font-bold text-primary">{product.reference}</span>
          )}
          {product.price > 0 && (
            <span className="shrink-0 text-xs text-primary/40">€{product.price}</span>
          )}
          {/* Cover thumbnail — lets you identify a product in the collapsed list
              without opening it. Always rendered (placeholder when there's no
              photo yet) so the rows stay aligned. */}
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border border-primary/10 bg-surface">
            {cover ? (
              <img
                src={resolveImage(cover, 200)}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="font-serif text-sm font-light text-primary/20">M</span>
            )}
          </span>
        </button>
        <button type="button" onClick={onDuplicate} title="Дублировать товар" className={BTN_GHOST}>
          ⧉
        </button>
        <button type="button" onClick={() => onMove(-1)} disabled={isFirst} className={BTN_GHOST}>
          ↑
        </button>
        <button type="button" onClick={() => onMove(1)} disabled={isLast} className={BTN_GHOST}>
          ↓
        </button>
        <button
          type="button"
          onClick={onRemove}
          title="Удалить товар"
          className="text-xs uppercase tracking-[0.18em] text-red-600 hover:underline px-2"
        >
          ×
        </button>
      </div>

      {/* Body */}
      {open && (
        <div className="border-t border-primary/10 p-4">
          <SectionLabel>Основная информация</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Название" value={product.name} onChange={(v) => set({ name: v })} />
            <Field
              label="Подзаголовок (мелким шрифтом рядом с названием, необязательно)"
              value={product.subtitle}
              onChange={(v) => set({ subtitle: v })}
            />
            <Field
              label="ID (уникальный, часть адреса страницы)"
              value={product.id}
              onChange={(v) => set({ id: urlSafe(v) })}
            />
          </div>

          <SectionLabel>Артикул и размер</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Referencia (артикул, необязательно)"
              value={product.reference}
              onChange={(v) => set({ reference: v })}
            />
            <Field label="Размер" value={product.size} onChange={(v) => set({ size: v })} />
          </div>

          <SectionLabel>Цена</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2">
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
          </div>
          <p className="mt-2 text-xs text-primary/40">
            «Старая цена» больше текущей → показывается зачёркнутой рядом с актуальной. 0 — без
            скидки.
          </p>

          <SectionLabel>Материал</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Материал (исп.)"
              value={product.material?.es}
              onChange={(v) => setMat('es', v)}
            />
            <Field
              label="Материал (англ.)"
              value={product.material?.en}
              onChange={(v) => setMat('en', v)}
            />
          </div>

          <SectionLabel>Описание</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2">
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
          <SectionLabel>Блок с иконками под кнопкой заказа</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Третий пункт"
              value={productPerkVariant(product)}
              onChange={(v) => set({ perks: v })}
              options={PERK_OPTIONS}
            />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-primary/40">
            Первые два пункта — «Entrega confiable» и «Instalación gratuita» — одинаковы у всех
            товаров. Здесь выбирается только третий, вместе со своей иконкой.
          </p>

          <SectionLabel>Фото и видео</SectionLabel>
          <ProductImagesEditor media={media} onChange={setMedia} />

          <SectionLabel>Обложка для мобильных</SectionLabel>
          <ImageField
            label="Обложка (мобильные)"
            value={product.imageMobile}
            onChange={(v) => set({ imageMobile: v })}
            frames={[['4 / 5', 'Карточка 4:5']]}
          />
          <p className="mt-2 text-xs leading-relaxed text-primary/40">
            Пусто — на мобильных используется первое фото из галереи.
          </p>

          <SectionLabel>Похожие товары («You may also like»)</SectionLabel>
          <p className="mb-2 text-xs leading-relaxed text-primary/40">
            Что показывать в блоке на странице этого товара. Пусто — берутся товары из этой же
            категории.
          </p>
          <ProductPicker
            value={product.related || []}
            onChange={(related) => set({ related })}
            allProducts={allProducts}
            excludeId={product.id}
            emptyHint="Пусто — автоматически из этой категории."
          />
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
