import { Field, Select, TextArea } from './Field.jsx';
import {
  DEFAULT_PERK_VARIANT,
  PERK_VARIANTS,
  productDiscount,
  productImages,
  productMedia,
  productPerkVariant,
  resolveImage,
  showsBulbsBadge,
  showsDiscountBadge,
} from '../../data/catalog.js';
import { translations } from '../../i18n/translations.js';
import ImageField from './ImageField.jsx';
import ProductImagesEditor from './ProductImagesEditor.jsx';
import ProductPicker from './ProductPicker.jsx';
import GiftEditor from './GiftEditor.jsx';
import RenameField from './RenameField.jsx';
import { urlSafe } from '../urlSafe.js';
import { IMAGE_SPECS } from '../imageSpecs.js';
import { applyUpdate } from '../update.js';

// The tabs of a product opened in the catalog (see ProductPanel). Each gets the
// product and `set(patch)`, which merges into the product as it is when the
// change lands, not as this render saw it — an upload lands seconds later
// (see ../update.js).

// Only the third perk of the strip differs between variants, so the dropdown is
// labelled with that perk's Spanish text — read straight from the translations
// so the two can't drift apart.
const PERK_OPTIONS = PERK_VARIANTS.map((value) => ({
  value,
  label:
    translations.es[`order.perk.${value}`] +
    (value === DEFAULT_PERK_VARIANT ? ' — по умолчанию' : ''),
}));

const NOTE = 'text-xs leading-relaxed text-primary/75';

function Group({ title, children }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

function Check({ checked, onChange, title, children }) {
  return (
    <label className="flex items-start gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
      />
      <span>
        <span className="block text-sm">{title}</span>
        {children && <span className={`block ${NOTE}`}>{children}</span>}
      </span>
    </label>
  );
}

// An article number is typed by hand and copied from wherever it was written
// first, which is how "L-23" came in with an Armenian "Լ": it looks the same,
// but nobody searching for L-23 finds it, and the feeds carry it as is.
const NON_LATIN = /[^ -~]/;

export function MainTab({ product, set, categorySlug, idError, onRename, onShowMedia }) {
  const { onSale, percent } = productDiscount(product);
  const photos = productImages(product);
  return (
    <div className="space-y-8">
      <Group title="Название">
        <div className="grid items-end gap-3 md:grid-cols-2">
          <Field label="Название (исп.)" value={product.name} onChange={(v) => set({ name: v })} />
          <Field
            label="Название (англ.) — для страниц /en; пусто = испанское"
            value={product.nameEn}
            onChange={(v) => set({ nameEn: v })}
          />
        </div>
        <Field
          label="Подзаголовок (мелким шрифтом рядом с названием, необязательно)"
          value={product.subtitle}
          onChange={(v) => set({ subtitle: v })}
        />
      </Group>

      <Group title="Цена">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <div className="w-36">
            <Field
              label="Цена (€)"
              type="number"
              value={product.price}
              onChange={(v) => set({ price: v === '' ? 0 : Number(v) })}
            />
          </div>
          <div className="w-36">
            <Field
              label="Старая цена (€, для скидки)"
              type="number"
              value={product.oldPrice}
              onChange={(v) => set({ oldPrice: v === '' ? 0 : Number(v) })}
            />
          </div>
          <p className="pb-2.5 text-sm tabular-nums">
            {onSale ? (
              <>
                На сайте: <strong className="font-semibold">{product.price} €</strong>{' '}
                <s className="text-secondary">{product.oldPrice} €</s> · скидка{' '}
                <strong className="font-semibold">−{percent}%</strong>
              </>
            ) : (
              <span className="text-primary/75">Без скидки</span>
            )}
          </p>
        </div>
        <p className={NOTE}>
          «Старая цена» больше текущей → показывается зачёркнутой рядом с актуальной. 0 — без
          скидки.
        </p>
        <Check
          checked={showsDiscountBadge(product)}
          onChange={(v) => set({ showDiscountBadge: v })}
          title="Показывать плашку со скидкой на фото"
        >
          Уголок «−{percent || 'N'}%» на фотографиях товара — в каталоге, на главной и на странице
          товара. Если снять галку, зачёркнутая старая цена останется.
        </Check>
      </Group>

      <Group title="Артикул и размеры">
        <div className="grid items-end gap-3 md:grid-cols-2">
          <div>
            <Field
              label="Referencia (артикул, необязательно)"
              value={product.reference}
              onChange={(v) => set({ reference: v })}
            />
            {NON_LATIN.test(product.reference || '') && (
              <p role="alert" className="mt-1 text-xs text-danger">
                В артикуле есть нелатинские буквы — по латинскому написанию его не найдёт ни поиск,
                ни фиды. Наберите артикул заново латиницей.
              </p>
            )}
          </div>
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
      </Group>

      <section aria-labelledby="product-photos">
        <div className="mb-3 flex items-baseline gap-3">
          <h3 id="product-photos" className="flex-1 text-sm font-semibold">
            Фото
          </h3>
          <button
            type="button"
            onClick={onShowMedia}
            className="text-sm font-medium underline underline-offset-4 hover:text-accent-text"
          >
            Все фото и видео
          </button>
        </div>
        {photos.length ? (
          <ul className="flex flex-wrap gap-2.5">
            {photos.slice(0, 6).map((src, i) => (
              <li key={src} className="w-[72px]">
                <span
                  className={`block aspect-[4/5] overflow-hidden bg-surface ${
                    i === 0 ? 'outline outline-2 -outline-offset-2 outline-primary' : ''
                  }`}
                >
                  <img
                    src={resolveImage(src, 200)}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </span>
                {i === 0 && <span className="mt-1 block text-xs font-medium">Обложка</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className={NOTE}>Фото ещё нет — добавьте их во вкладке «Фото и видео».</p>
        )}
      </section>

      <section className="border-t border-primary/15 pt-6">
        <RenameField
          label="Адрес страницы (ID)"
          prefix={`hsmuebles.es/${categorySlug}/`}
          value={product.id}
          normalize={(v) => urlSafe(v)}
          validate={idError}
          onRename={onRename}
          warning="Новый ID меняет адрес страницы и номер товара в Google Shopping и каталоге Meta: старая ссылка перестанет открываться, а реклама начнёт копить статистику по товару заново. «Похожие», подарки и «Избранное», где стоит этот товар, обновятся сами."
        />
      </section>
    </div>
  );
}

export function MediaTab({ product, set }) {
  const media = productMedia(product);
  // Unified ordered media (photos + videos). Keep the legacy cover fields
  // (`image`/`images`) in sync so the catalog card, OG image and Schema.org —
  // all photo-only — stay correct without a separate save step.
  const setMedia = (next) =>
    set((p) => {
      const list = applyUpdate(next, productMedia(p));
      const photos = list.filter((m) => m.type === 'image').map((m) => m.src);
      return { media: list, image: photos[0] || '', images: photos, video: '', videoFirst: false };
    });
  return (
    <div className="space-y-8">
      <ProductImagesEditor media={media} onChange={setMedia} />
      <Group title="Обложка для мобильных">
        <ImageField
          label="Обложка (мобильные)"
          value={product.imageMobile}
          onChange={(v) => set({ imageMobile: v })}
          frames={[['4 / 5', 'Карточка 4:5']]}
          spec={IMAGE_SPECS.card}
        />
        <p className={NOTE}>Пусто — на мобильных используется первое фото из галереи.</p>
      </Group>
    </div>
  );
}

export function TextTab({ product, set }) {
  const setPair = (key, lang, value) => set((p) => ({ [key]: { ...p[key], [lang]: value } }));
  return (
    <div className="space-y-8">
      <Group title="Описание">
        <TextArea
          label="Описание (исп.)"
          rows={8}
          value={product.description?.es}
          onChange={(v) => setPair('description', 'es', v)}
        />
        <TextArea
          label="Описание (англ.)"
          rows={8}
          value={product.description?.en}
          onChange={(v) => setPair('description', 'en', v)}
        />
      </Group>
      <Group title="Материал">
        <div className="grid items-end gap-3 md:grid-cols-2">
          <Field
            label="Материал (исп.)"
            value={product.material?.es}
            onChange={(v) => setPair('material', 'es', v)}
          />
          <Field
            label="Материал (англ.)"
            value={product.material?.en}
            onChange={(v) => setPair('material', 'en', v)}
          />
        </div>
      </Group>
    </div>
  );
}

export function PromoTab({ product, set, allProducts }) {
  return (
    <div className="space-y-8">
      <Group title="Плашки на фото">
        <Check
          checked={showsBulbsBadge(product)}
          onChange={(v) => set({ showBulbsBadge: v })}
          title="Показывать плашку «лампочки в подарок»"
        >
          Белый уголок «+ 💡 de regalo» встаёт на то же место, что и скидка: на компьютере скидка
          сменяется им при наведении курсора, на телефонах они чередуются каждые 3 секунды. По
          умолчанию включена там, где ниже выбран третий пункт «Bombillas LED de regalo».
        </Check>
      </Group>
      <Group title="Блок с иконками под кнопкой заказа">
        <div className="max-w-md">
          <Select
            label="Третий пункт"
            value={productPerkVariant(product)}
            onChange={(v) => set({ perks: v })}
            options={PERK_OPTIONS}
          />
        </div>
        <p className={NOTE}>
          Первые два пункта — «Entrega confiable» и «Instalación gratuita» — одинаковы у всех
          товаров. Здесь выбирается только третий, вместе со своей иконкой.
        </p>
      </Group>
      <Group title="Подарок">
        <GiftEditor
          value={product.gift}
          onChange={(gift) => set((p) => ({ gift: applyUpdate(gift, p.gift) }))}
          allProducts={allProducts}
          excludeId={product.id}
          forProduct
        />
      </Group>
    </div>
  );
}

export function RelatedTab({ product, set, allProducts }) {
  return (
    <Group title="Похожие товары («You may also like»)">
      <p className={NOTE}>
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
    </Group>
  );
}
