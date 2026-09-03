import { Field, Select } from './Field.jsx';
import ImageField from './ImageField.jsx';
import { productOptionLabel } from '../productLabel.js';

// The gift offer, edited the same way on a category (where it is the rule every
// product inherits) and on a single product (where it overrides that rule).
//
// One dropdown rather than a mode and a source next to each other: "как у
// категории" and "без подарка" are answers to the same question as "стеллаж из
// каталога", and asking it twice made the common case — leave it alone — the
// one that needed two controls. The four answers map onto the stored shape
// (see normalizeGift in server/store.js, productGift in src/data/catalog.js):
//
//   inherit → {}                                            products only
//   catalog → { mode:'own', source:'catalog', productId }    mode omitted on a category
//   custom  → { mode:'own', source:'custom', name, size, image }
//   off     → { mode:'off' }                                 products only
//
// A category has no mode: it carries the rule itself, so its "нет подарка" is
// simply an empty object.
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

/** Which of the choices above the stored object represents. */
function giftChoice(gift, forProduct) {
  const g = gift ?? {};
  if (forProduct) {
    if (g.mode === 'off') return 'off';
    if (g.mode !== 'own') return 'inherit';
  } else if (!g.source) {
    return 'none';
  }
  return g.source === 'custom' ? 'custom' : 'catalog';
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
          <label className="mt-3 flex items-start gap-2">
            <input
              type="checkbox"
              checked={gift.showPrice !== false}
              onChange={(e) => set({ showPrice: e.target.checked })}
              className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
            />
            <span>
              <span className="block text-sm text-primary">Показывать цену подарка</span>
              <span className="block text-xs leading-relaxed text-primary/40">
                Приписка «(valor 89 €)» в строке под ценой товара — сколько стоит то, что человек
                получает бесплатно.
              </span>
            </span>
          </label>
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
          <ImageField
            label="Фото подарка"
            value={gift.image}
            onChange={(image) => set({ image })}
            frames={[['4 / 5', 'Уголок на фото 4:5']]}
          />
          <p className="text-xs leading-relaxed text-primary/40">
            Показывается маленькой врезкой в углу фотографии товара. Без фото врезки не будет —
            останется только строчка под ценой.
          </p>
        </div>
      )}
    </div>
  );
}
