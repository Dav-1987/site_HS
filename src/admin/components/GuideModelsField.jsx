import { Field, Select } from './Field.jsx';
import ProductPicker from './ProductPicker.jsx';
import { GUIDE_LIMITS, guideProducts } from '../../data/guides.js';
import { listingCatalog, productFullName } from '../../data/catalog.js';

const TYPES = [
  { value: '', label: 'Любые' },
  { value: 'bulbs', label: 'С лампочками (Hollywood)' },
  { value: 'led', label: 'Со светодиодной подсветкой' },
];

// A number field's text as the rule stores it: empty is "no limit".
const widthOf = (text) => (text === '' ? null : Number(text));

/**
 * «Модели в статье»: the rule that picks the models shown at the end of the
 * article (guideProducts — the page runs the same one), the ones pinned first,
 * and what the rule picks right now from the catalog being edited.
 */
export default function GuideModelsField({ rule, onChange, categories, allProducts }) {
  const set = (patch) => onChange((r) => ({ ...r, ...patch }));
  const picked = guideProducts(listingCatalog(categories ?? []), rule);
  const sections = [
    { value: '', label: 'Любой раздел' },
    ...(categories ?? []).map((c) => ({ value: c.slug, label: c.name?.es || c.slug })),
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Раздел каталога"
          value={rule.category}
          onChange={(category) => set({ category })}
          options={sections}
        />
        <Select
          label="Подсветка"
          value={rule.type}
          onChange={(type) => set({ type })}
          options={TYPES}
        />
        <Field
          label="Ширина от, см (пусто — любая)"
          type="number"
          min={1}
          max={GUIDE_LIMITS.width}
          value={rule.minWidth ?? ''}
          onChange={(v) => set({ minWidth: widthOf(v) })}
        />
        <Field
          label="Ширина до, см (пусто — любая)"
          type="number"
          min={1}
          max={GUIDE_LIMITS.width}
          value={rule.maxWidth ?? ''}
          onChange={(v) => set({ maxWidth: widthOf(v) })}
        />
        <Field
          label="Сколько моделей показать (0 — без блока)"
          type="number"
          min={0}
          max={GUIDE_LIMITS.productLimit}
          value={rule.limit}
          onChange={(v) => set({ limit: v === '' ? 0 : Number(v) })}
        />
      </div>

      <div>
        <p className="text-sm font-medium text-primary/80">Закрепить модели — встанут первыми</p>
        <div className="mt-2">
          <ProductPicker
            value={rule.pinned}
            onChange={(pinned) => set({ pinned })}
            allProducts={allProducts}
            emptyHint="Ничего не закреплено: модели подбираются по правилу выше."
          />
        </div>
      </div>

      <div className="border-t border-primary/10 pt-4">
        <p className="text-sm font-medium text-primary/80">Сейчас в статье</p>
        {picked.length ? (
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            {picked.map(({ product, category }) => (
              <li key={product.id}>
                {productFullName(product, 'es') || product.id}{' '}
                <span className="text-primary/75">
                  — {product.id}, {product.size || 'без размера'}, раздел «
                  {category.name?.es || category.slug}»
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-sm text-primary/75">
            {rule.limit === 0
              ? 'Блока моделей в статье не будет.'
              : 'Под правило сейчас не подходит ни одна модель на сайте — блок покажет только ссылку на раздел, если он выбран.'}
          </p>
        )}
        <p className="mt-2 text-xs leading-relaxed text-primary/75">
          Снятые с сайта и скрытые из списков модели в статью не попадают — и закреплённые тоже.
        </p>
      </div>
    </div>
  );
}
