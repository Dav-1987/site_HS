import { useState } from 'react';
import { Field, Select, TextArea } from './Field.jsx';
import { urlSafe } from '../urlSafe.js';
import {
  DEFAULT_PERK_VARIANT,
  PERK_VARIANTS,
  productDiscount,
  productMedia,
  productPerkVariant,
  resolveImage,
  showsDiscountBadge,
} from '../../data/catalog.js';
import { translations } from '../../i18n/translations.js';
import ImageField from './ImageField.jsx';
import ProductImagesEditor from './ProductImagesEditor.jsx';
import ProductPicker from './ProductPicker.jsx';
import GiftEditor from './GiftEditor.jsx';
import VisibilitySelect, {
  VisibilityBadge,
  VisibilityMenuItems,
  VisibilityNote,
} from './VisibilitySelect.jsx';
import StockToggle, { StockBadge, StockMenuItem, StockNote } from './StockToggle.jsx';
import RowActions from './RowActions.jsx';
import { useIsCompact } from '../useIsCompact.js';

const PRODUCT_ACTIONS = {
  more: 'Действия с товаром',
  duplicate: 'Дублировать товар',
  up: 'Переместить выше',
  down: 'Переместить ниже',
  remove: 'Удалить товар',
};

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
  const compact = useIsCompact();
  const set = (patch) => onChange({ ...product, ...patch });
  const setMat = (lang, val) => set({ material: { ...product.material, [lang]: val } });
  const setDesc = (lang, val) => set({ description: { ...product.description, [lang]: val } });
  // Unified ordered media (photos + videos). Keep the legacy cover fields
  // (`image`/`images`) in sync so the catalog card, OG image and Schema.org —
  // all photo-only — stay correct without a separate save step.
  const media = productMedia(product);
  // First photo = the catalog cover (same rule as ProductImagesEditor).
  const cover = media.find((m) => m.type === 'image')?.src;
  // Live discount percent, so the badge checkbox names the exact figure the
  // photo would carry ("−13%") instead of an abstract one.
  const { percent } = productDiscount(product);
  const setMedia = (next) => {
    const photos = next.filter((m) => m.type === 'image').map((m) => m.src);
    set({ media: next, image: photos[0] || '', images: photos, video: '', videoFirst: false });
  };

  // Collapsed-row pieces, shared by the two arrangements below.
  const TOGGLE_GLYPH = `shrink-0 text-base transition-transform ${open ? 'rotate-45' : ''}`;
  const name = (
    <span className="truncate font-serif text-lg font-light text-primary">
      {product.name || <span className="text-primary/30">Новый товар</span>}
      {product.subtitle && <span className="ml-2 text-sm text-primary/40">{product.subtitle}</span>}
    </span>
  );
  const meta = (
    <>
      {product.reference && (
        <span className="shrink-0 text-sm font-bold text-primary">{product.reference}</span>
      )}
      {product.price > 0 && (
        <span className="shrink-0 text-xs text-primary/40">€{product.price}</span>
      )}
    </>
  );
  // Cover thumbnail — lets you identify a product in the collapsed list without
  // opening it. Always rendered (placeholder when there's no photo yet) so the
  // rows stay aligned.
  const thumbnail = (
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
  );
  const badges = (
    <>
      <VisibilityBadge entity={product} />
      <StockBadge product={product} />
    </>
  );

  return (
    <div className="border border-primary/10 bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left sm:gap-3"
        >
          {/* Phone: photo first, name truncated next to it, the small print
              wrapped onto a second line — a row this narrow can't hold them
              side by side. Desktop keeps the single line it always had. */}
          {compact ? (
            <>
              {thumbnail}
              <span className={TOGGLE_GLYPH}>+</span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                {name}
                <span className="flex flex-wrap items-center gap-2">
                  {meta}
                  {badges}
                </span>
              </span>
            </>
          ) : (
            <>
              <span className={TOGGLE_GLYPH}>+</span>
              {name}
              {meta}
              {thumbnail}
              {badges}
            </>
          )}
        </button>
        {!compact && (
          <>
            <VisibilitySelect
              value={product.visibility}
              onChange={(visibility) => set({ visibility })}
              title="Видимость товара"
            />
            <StockToggle product={product} onChange={(inStock) => set({ inStock })} />
          </>
        )}
        <RowActions
          labels={PRODUCT_ACTIONS}
          isFirst={isFirst}
          isLast={isLast}
          onDuplicate={onDuplicate}
          onMove={onMove}
          onRemove={onRemove}
          extras={
            <>
              <StockMenuItem product={product} onChange={(inStock) => set({ inStock })} />
              <VisibilityMenuItems
                value={product.visibility}
                onChange={(visibility) => set({ visibility })}
              />
            </>
          }
        />
      </div>

      {/* Body */}
      {open && (
        <div className="border-t border-primary/10 p-3 sm:p-4">
          <VisibilityNote entity={product} kind="product" />
          <StockNote product={product} />
          <SectionLabel>Основная информация</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              label="Название (исп.)"
              value={product.name}
              onChange={(v) => set({ name: v })}
            />
            <Field
              label="Название (англ.) — для страниц /en; пусто = испанское"
              value={product.nameEn}
              onChange={(v) => set({ nameEn: v })}
            />
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
            <Field
              label="Размер зеркала (отдельной строкой в характеристиках; пусто — строки нет)"
              value={product.mirrorSize}
              onChange={(v) => set({ mirrorSize: v })}
            />
            <Field
              label="Размер полок (строкой под зеркалом; пусто — строки нет)"
              value={product.shelvesSize}
              onChange={(v) => set({ shelvesSize: v })}
            />
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
          <label className="mt-3 flex items-start gap-2">
            <input
              type="checkbox"
              checked={showsDiscountBadge(product)}
              onChange={(e) => set({ showDiscountBadge: e.target.checked })}
              className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
            />
            <span>
              <span className="block text-sm text-primary">
                Показывать плашку со скидкой на фото
              </span>
              <span className="block text-xs leading-relaxed text-primary/40">
                Уголок «−{percent || 'N'}%» на фотографиях товара — в каталоге, на главной и на
                странице товара. Если снять галку, зачёркнутая старая цена останется.
              </span>
            </span>
          </label>

          <SectionLabel>Подарок</SectionLabel>
          <GiftEditor
            value={product.gift}
            onChange={(gift) => set({ gift })}
            allProducts={allProducts}
            excludeId={product.id}
            forProduct
          />

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
