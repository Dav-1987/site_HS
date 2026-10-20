import { useAdmin } from '../useAdmin.js';
import { BTN_GHOST } from '../ui.js';
import CategoryEditor from '../components/CategoryEditor.jsx';
import SectionPending from './SectionPending.jsx';

/** Каталог: categories and their products, plus the catalog's version history. */
export default function CatalogSection() {
  const {
    categories,
    loadError,
    openIdx,
    setOpenIdx,
    setShowHistory,
    allProducts,
    categoryOptions,
    updateCategory,
    removeCategory,
    moveCategory,
    addCategory,
    duplicateCategory,
    moveProducts,
  } = useAdmin().editor;

  if (!categories) return <SectionPending error={loadError} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => setShowHistory(true)} className={BTN_GHOST}>
          История изменений
        </button>
      </div>

      {categories.map((c, ci) => (
        <CategoryEditor
          key={ci}
          category={c}
          open={openIdx === ci}
          onToggle={() => setOpenIdx(openIdx === ci ? null : ci)}
          onChange={(next) => updateCategory(ci, c.slug, next)}
          onRemove={() => removeCategory(ci)}
          onMove={(dir) => moveCategory(ci, dir)}
          onDuplicate={() => duplicateCategory(ci)}
          isFirst={ci === 0}
          isLast={ci === categories.length - 1}
          allProducts={allProducts}
          allCategories={categories}
          categoryOptions={categoryOptions}
          onMoveProducts={(ids, toSlug) => moveProducts(c.slug, ids, toSlug)}
        />
      ))}

      <button
        type="button"
        onClick={addCategory}
        className={`${BTN_GHOST} w-full justify-center py-4`}
      >
        + Добавить категорию
      </button>
    </div>
  );
}
