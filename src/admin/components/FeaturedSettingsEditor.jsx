import { useState } from 'react';
import ProductPicker from './ProductPicker.jsx';

export default function FeaturedSettingsEditor({ value, onChange, allProducts }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-primary/15 bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <span className={`text-base transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
        <span className="font-serif text-xl font-light text-primary">Избранное</span>
        <span className="text-xs uppercase tracking-[0.18em] text-primary/40">Featured pieces</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-primary/10 px-5 py-6">
          <p className="text-xs leading-relaxed text-primary/45">
            Товары для блока «Featured pieces» на главной, в выбранном порядке.
            Пусто — подборка формируется автоматически.
          </p>
          <ProductPicker
            value={value}
            onChange={onChange}
            allProducts={allProducts}
            emptyHint="Пусто — товары подбираются автоматически."
          />
        </div>
      )}
    </div>
  );
}
