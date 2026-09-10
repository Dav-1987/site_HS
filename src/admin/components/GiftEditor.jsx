import { Field, Select } from './Field.jsx';
import GiftImagesEditor from './GiftImagesEditor.jsx';
import ImageField from './ImageField.jsx';
import { productOptionLabel } from '../productLabel.js';
import { giftChoice } from '../gift.js';
import { giftImages } from '../../data/catalog.js';
import { IMAGE_SPECS } from '../imageSpecs.js';

// The gift offer, edited the same way on a category (where it is the rule every
// product inherits) and on a single product (where it overrides that rule).
//
// One dropdown rather than a mode and a source next to each other: "как у
// категории" and "без подарка" are answers to the same question as "стеллаж из
// каталога", and asking it twice made the common case — leave it alone — the
// one that needed two controls. How the four answers map onto the stored shape
// is in src/admin/gift.js, next to giftChoice().
const CATEGORY_CHOICES = [
  { value: 'none', label: 'Нет подарка' },
  { value: 'catalog', label: 'Товар из каталога' },
  { value: 'custom', label: 'Свой подарок — не из каталога' },
];

const PRODUCT_CHOICES = [
  { value: 'inherit', label: 'Как у категории' },
  { value: 'catalog', label: 'Свой — товар из каталога' },
  { value: 'custom', label: 'Свой — не из каталога' },
  { value: 'off', label: 'Без подарка' },
];

// Сколько штук идёт в подарок — вопрос одинаковый для обоих источников, и
// одинаково необязательный: пусто и «1» означают одно и то же, потому что
// подарок «одна штука» — это девяносто девять предложений из ста, и писать в них
// «1 ×» было бы шумом.
function CountField({ value, onChange }) {
  return (
    <div className="mt-3">
      <Field
        label="Сколько штук"
        type="number"
        value={value ?? ''}
        onChange={(qty) => onChange(qty === '' ? '' : Number(qty))}
        placeholder="1"
      />
      <p className="mt-2 text-xs leading-relaxed text-primary/40">
        Пусто или 1 — на сайте количество не показывается, как было раньше. Больше одного — сайт
        пишет «2 × Estantería» всюду, где назван подарок (строка под ценой, плашка на фото, окно
        подарка, заявка в Telegram), а цену «valor» считает за все штуки.
      </p>
    </div>
  );
}

// Картинка для плашки в углу фото товара. Она там размером с ноготь: снимок
// полки в интерьере на ней не читается, а крупный план, который читается, — не
// то фото, которое хочется видеть на странице самой полки. Поэтому отдельное
// поле, а не подмена галереи: пусто — плашка берёт, как и раньше, первое фото
// подарка.
function BadgeImageField({ value, onChange }) {
  return (
    <div className="mt-3">
      <ImageField
        label="Картинка для плашки на фото"
        value={value}
        onChange={onChange}
        frames={[['4 / 5', 'Плашка 4:5']]}
        spec={IMAGE_SPECS.giftBadge}
        hint="Пусто — плашка возьмёт первое фото подарка. В окне подарка, которое она открывает, в любом случае остаются настоящие фото товара."
      />
    </div>
  );
}

// Both sources can be told to keep the value to themselves, so the control is
// written once. What differs is only where the number comes from, which is what
// the hint says.
function ShowPriceToggle({ checked, onChange, hint }) {
  return (
    <label className="mt-3 flex items-start gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
      />
      <span>
        <span className="block text-sm text-primary">Показывать цену подарка</span>
        <span className="block text-xs leading-relaxed text-primary/40">{hint}</span>
      </span>
    </label>
  );
}

export default function GiftEditor({ value, onChange, allProducts, excludeId, forProduct }) {
  const gift = value ?? {};
  const choice = giftChoice(gift, forProduct);
  const set = (patch) => onChange({ ...gift, ...patch });

  const setChoice = (next) => {
    if (next === 'inherit' || next === 'none') return onChange({});
    if (next === 'off') return onChange({ mode: 'off' });
    // Everything already typed is kept when switching between the two sources,
    // so trying the other one and coming back doesn't cost the work.
    return onChange({ ...gift, ...(forProduct ? { mode: 'own' } : {}), source: next });
  };

  const productOptions = [
    { value: '', label: '— выберите товар —' },
    ...(allProducts ?? [])
      .filter((p) => p.id !== excludeId)
      .map((p) => ({ value: p.id, label: productOptionLabel(p) })),
  ];

  return (
    <div>
      <Select
        label={forProduct ? 'Подарок к этому товару' : 'Подарок ко всем товарам категории'}
        value={choice}
        onChange={setChoice}
        options={forProduct ? PRODUCT_CHOICES : CATEGORY_CHOICES}
      />

      {choice === 'catalog' && (
        <div className="mt-3">
          <Select
            label="Что дарим"
            value={gift.productId || ''}
            onChange={(productId) => set({ productId })}
            options={productOptions}
          />
          <p className="mt-2 text-xs leading-relaxed text-primary/40">
            Название, размеры, фото и цену сайт возьмёт у самого товара — переписывать их здесь не
            нужно. Если подарок не продаётся отдельно, поставьте ему видимость «не в каталоге»:
            страница останется на месте, а из списков он пропадёт.
          </p>
          <CountField value={gift.qty} onChange={(qty) => set({ qty })} />
          <BadgeImageField value={gift.badgeImage} onChange={(badgeImage) => set({ badgeImage })} />
          <ShowPriceToggle
            checked={gift.showPrice !== false}
            onChange={(showPrice) => set({ showPrice })}
            hint="Приписка «(valor 89 €)» в строке под ценой товара — сколько стоит то, что человек получает бесплатно. Цена берётся у самого товара и умножается на количество."
          />
        </div>
      )}

      {choice === 'custom' && (
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Название подарка (исп.)"
              value={gift.name?.es}
              onChange={(es) => set({ name: { ...gift.name, es } })}
            />
            <Field
              label="Название подарка (англ.)"
              value={gift.name?.en}
              onChange={(en) => set({ name: { ...gift.name, en } })}
            />
          </div>
          <Field
            label="Размеры"
            value={gift.size}
            onChange={(size) => set({ size })}
            placeholder="60 × 180 cm"
          />
          <p className="text-xs leading-relaxed text-primary/40">
            Одно поле на оба языка — цифры одинаковы. Пусто, если размеры подарку не нужны.
          </p>
          {/* `image` is kept alongside `images` for the reason a product keeps
              one: the inset, and anything else that needs a single photo, reads
              that field without having to know an array exists. Written here
              rather than derived on read so the two can never disagree. */}
          <GiftImagesEditor
            value={giftImages(gift)}
            onChange={(images) => set({ images, image: images[0] || '' })}
          />
          <Field
            label="Цена подарка, €"
            type="number"
            value={gift.price ?? ''}
            onChange={(price) => set({ price: price === '' ? '' : Number(price) })}
            placeholder="89"
          />
          <CountField value={gift.qty} onChange={(qty) => set({ qty })} />
          <BadgeImageField value={gift.badgeImage} onChange={(badgeImage) => set({ badgeImage })} />
          <ShowPriceToggle
            checked={gift.showPrice !== false}
            onChange={(showPrice) => set({ showPrice })}
            hint="Приписка «(valor 89 €)» в строке под ценой товара — сколько стоит то, что человек получает бесплатно. Цена за штуку, на сайте умножается на количество. Пустая цена ничего не показывает и без галочки."
          />
        </div>
      )}
    </div>
  );
}
