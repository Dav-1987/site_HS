import { useState } from 'react';
import { BTN_GHOST, BTN_SOLID, INPUT } from '../ui.js';
import { Field, TextArea } from './Field.jsx';
import { urlSafe, RESERVED_SLUGS } from '../urlSafe.js';
import { DEFAULT_VISIBILITY, isTileEntryCategory } from '../../data/catalog.js';
import ImageField from './ImageField.jsx';
import VideoField from './VideoField.jsx';
import ProductEditor from './ProductEditor.jsx';
import VisibilitySelect, { VisibilityBadge, VisibilityNote } from './VisibilitySelect.jsx';

export default function CategoryEditor({
  category,
  open,
  onToggle,
  onChange,
  onRemove,
  onMove,
  onDuplicate,
  isFirst,
  isLast,
  allProducts,
  categoryOptions,
  onMoveProducts,
}) {
  // Bulk "move to another category" — selection is local (not persisted):
  // it's a transient action, and product ids stay valid across a move since
  // they're unique catalog-wide, so nothing here needs to survive a re-open.
  const [selected, setSelected] = useState(() => new Set());
  const [moveTarget, setMoveTarget] = useState('');
  const toggleSelected = (id) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allSelected = category.products.length > 0 && selected.size === category.products.length;
  const toggleSelectAll = () =>
    setSelected(allSelected ? new Set() : new Set(category.products.map((p) => p.id)));
  const moveTargets = (categoryOptions || []).filter((c) => c.slug !== category.slug);
  const handleMoveSelected = () => {
    if (!moveTarget) return;
    onMoveProducts(Array.from(selected), moveTarget);
    setSelected(new Set());
    setMoveTarget('');
  };

  const set = (patch) => onChange({ ...category, ...patch });
  const setI18n = (key, lang, val) =>
    set({ [key]: { ...category[key], [lang]: val } });

  const updateProduct = (pi, next) =>
    set({ products: category.products.map((p, i) => (i === pi ? next : p)) });
  const removeProduct = (pi) => {
    if (!window.confirm('Удалить этот товар?')) return;
    set({ products: category.products.filter((_, i) => i !== pi) });
  };
  const moveProduct = (pi, dir) => {
    const target = pi + dir;
    if (target < 0 || target >= category.products.length) return;
    const next = [...category.products];
    [next[pi], next[target]] = [next[target], next[pi]];
    set({ products: next });
  };
  const addProduct = () =>
    set({
      products: [
        ...category.products,
        {
          id: `${category.slug || 'item'}-${Date.now().toString(36)}`,
          name: '',
          price: 0,
          oldPrice: 0,
          image: '',
          imageMobile: '',
          images: [],
          material: { es: '', en: '' },
          size: '',
          visibility: DEFAULT_VISIBILITY,
          showDiscountBadge: true,
          inStock: true,
        },
      ],
    });
  const duplicateProduct = (pi) => {
    const src = category.products[pi];
    const copy = {
      ...src,
      id: `${src.id}-copy-${Date.now().toString(36)}`,
    };
    set({ products: [...category.products, copy] });
  };

  return (
    <div className="border border-primary/15 bg-surface">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-5 py-4">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <span className={`text-base transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
          <span className="font-serif text-xl font-light text-primary">
            {category.name?.es || category.slug || 'Новая категория'}
          </span>
          <span className="text-xs uppercase tracking-[0.18em] text-primary/40">
            {category.products.length} тов.
          </span>
          <VisibilityBadge entity={category} />
        </button>
        <VisibilitySelect
          value={category.visibility}
          onChange={(visibility) => set({ visibility })}
          title="Видимость категории"
        />
        <button type="button" onClick={onDuplicate} title="Дублировать категорию" className={BTN_GHOST}>⧉</button>
        <button type="button" onClick={() => onMove(-1)} disabled={isFirst} className={BTN_GHOST}>↑</button>
        <button type="button" onClick={() => onMove(1)} disabled={isLast} className={BTN_GHOST}>↓</button>
        <button type="button" onClick={onRemove} title="Удалить категорию" className="text-xs uppercase tracking-[0.18em] text-red-600 hover:underline px-2">×</button>
      </div>

      {open && (
        <div className="space-y-6 border-t border-primary/10 px-5 py-6">
          {isTileEntryCategory(category) && (
            <p className="border-l-2 border-primary/20 bg-background px-3 py-2 text-xs leading-relaxed text-primary/60">
              Этот раздел не показывается в списке коллекций — ни в меню, ни на главной, ни в
              каталоге. Вход в него один: плитка с его названием в конце сетки товаров каждой
              категории. Поэтому «Показывать» здесь означает «плитка есть», а «Скрыть из списков» —
              «плитки нет, раздел открывается только по прямой ссылке».
            </p>
          )}
          <VisibilityNote entity={category} kind="category" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Field
                label="Slug (адрес в URL)"
                value={category.slug}
                onChange={(v) => set({ slug: urlSafe(v, { lower: true }) })}
              />
              {RESERVED_SLUGS.includes(category.slug) && (
                <p className="mt-1 text-xs text-red-600">
                  Этот slug занят системной страницей сайта — категория будет недоступна по своему адресу.
                </p>
              )}
            </div>
            <Field label="Название (исп.)" value={category.name?.es} onChange={(v) => setI18n('name', 'es', v)} />
            <Field label="Название (англ.)" value={category.name?.en} onChange={(v) => setI18n('name', 'en', v)} />
            <Field label="Слоган (исп.)" value={category.tagline?.es} onChange={(v) => setI18n('tagline', 'es', v)} />
            <Field label="Слоган (англ.)" value={category.tagline?.en} onChange={(v) => setI18n('tagline', 'en', v)} />
          </div>
          <ImageField
            label="Изображение категории (ПК)"
            value={category.image}
            onChange={(v) => set({ image: v })}
            frames={[['4 / 5', 'Карточка 4:5']]}
          />
          <ImageField
            label="Изображение категории (мобильные)"
            value={category.imageMobile}
            onChange={(v) => set({ imageMobile: v })}
            frames={[['4 / 5', 'Карточка 4:5']]}
          />
          <VideoField
            label="Видео категории (проигрывается при наведении)"
            value={category.video}
            onChange={(v) => set({ video: v })}
          />
          <TextArea
            label="Описание (исп.)"
            value={category.description?.es}
            onChange={(v) => setI18n('description', 'es', v)}
          />
          <TextArea
            label="Описание (англ.)"
            value={category.description?.en}
            onChange={(v) => setI18n('description', 'en', v)}
          />

          {/* Products */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-xs uppercase tracking-[0.2em] text-primary/50">Товары</h3>
                {category.products.length > 0 && (
                  <label className="flex items-center gap-1.5 text-xs text-primary/50">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 accent-accent"
                    />
                    Выбрать все
                  </label>
                )}
              </div>
              <button type="button" onClick={addProduct} className={BTN_GHOST}>
                + Добавить товар
              </button>
            </div>

            {selected.size > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-3 border border-accent/40 bg-accent/5 px-4 py-3">
                <span className="text-xs uppercase tracking-[0.18em] text-primary/70">
                  Выбрано: {selected.size}
                </span>
                <select
                  className={`${INPUT} w-auto flex-1 sm:flex-none sm:w-64`}
                  value={moveTarget}
                  onChange={(e) => setMoveTarget(e.target.value)}
                >
                  <option value="">Переместить в…</option>
                  {moveTargets.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleMoveSelected}
                  disabled={!moveTarget}
                  className={BTN_SOLID}
                >
                  Переместить выбранные
                </button>
                <button type="button" onClick={() => setSelected(new Set())} className={BTN_GHOST}>
                  Снять выбор
                </button>
              </div>
            )}

            <div className="space-y-4">
              {category.products.map((p, pi) => (
                <div key={pi} className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggleSelected(p.id)}
                    aria-label={`Выбрать ${p.name || p.id}`}
                    className="mt-4 h-4 w-4 shrink-0 accent-accent"
                  />
                  <div className="min-w-0 flex-1">
                    <ProductEditor
                      product={p}
                      onChange={(next) => updateProduct(pi, next)}
                      onRemove={() => removeProduct(pi)}
                      onMove={(dir) => moveProduct(pi, dir)}
                      onDuplicate={() => duplicateProduct(pi)}
                      isFirst={pi === 0}
                      isLast={pi === category.products.length - 1}
                      allProducts={allProducts}
                    />
                  </div>
                </div>
              ))}
              {category.products.length === 0 && (
                <p className="text-sm text-primary/40">Пока нет товаров.</p>
              )}
            </div>
            <button type="button" onClick={addProduct} className={`${BTN_GHOST} mt-4 w-full justify-center`}>
              + Добавить товар
            </button>
          </div>

          <div className="border-t border-primary/10 pt-4">
            <button
              type="button"
              onClick={onRemove}
              className="text-xs uppercase tracking-[0.18em] text-red-600 hover:underline"
            >
              Удалить категорию
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
