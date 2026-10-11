import { useState } from 'react';

// Sections of the home page that can be switched off wholesale. Each key maps to
// a flag in settings.blocks (see BLOCKS in src/data/settings.js) that the page
// checks before rendering. Off means the section isn't rendered at all — not
// hidden with CSS — so nothing is left behind in the markup.
//
// «Избранное» switches per layout instead: one flag for phones, one for PC
// (md+ screens). Off on both means the section isn't rendered; off on one means
// it's rendered and hidden there with CSS — the page can't know the screen
// width at render time.
const FEATURED_DEVICES = [
  { key: 'featured', label: 'На мобильных', on: (v) => v !== false },
  // Opt-in: the section used to be phone-only (see BLOCKS_OFF_BY_DEFAULT).
  { key: 'featuredDesktop', label: 'На ПК', on: (v) => v === true },
];

const BLOCK_FIELDS = [
  {
    key: 'collections',
    label: 'Коллекции',
    hint: 'Сетка категорий на главной, под первым экраном.',
  },
  {
    key: 'heroPromo',
    label: 'Промо-строка в первом экране',
    hint: 'Крупная строка с акцией под подзаголовком на главной.',
  },
];

export default function BlocksEditor({ blocks, onChange }) {
  const [open, setOpen] = useState(false);
  const set = (key, value) => onChange({ ...blocks, [key]: value });
  const featuredOn = FEATURED_DEVICES.filter((d) => d.on(blocks?.[d.key]));
  const hiddenCount =
    BLOCK_FIELDS.filter((f) => blocks?.[f.key] === false).length + (featuredOn.length ? 0 : 1);

  return (
    <div className="border border-primary/15 bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <span className={`text-base transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
        <span className="font-serif text-xl font-light text-primary">Блоки главной</span>
        <span className="text-xs uppercase tracking-[0.18em] text-primary/40">
          {hiddenCount ? `${hiddenCount} скрыто` : 'все показаны'}
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-primary/10 px-5 py-6">
          <fieldset>
            <legend className="block text-sm text-primary">Избранное</legend>
            <span className="block text-xs leading-relaxed text-primary/40">
              Карусель избранных товаров на главной. Выключите обе галочки, чтобы убрать её
              совсем.
            </span>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
              {FEATURED_DEVICES.map((d) => (
                <label key={d.key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={d.on(blocks?.[d.key])}
                    onChange={(e) => set(d.key, e.target.checked)}
                    className="h-4 w-4 shrink-0 accent-accent"
                  />
                  <span className="text-sm text-primary">{d.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {BLOCK_FIELDS.map((f) => (
            <label key={f.key} className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={blocks?.[f.key] !== false}
                onChange={(e) => set(f.key, e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
              />
              <span>
                <span className="block text-sm text-primary">{f.label}</span>
                <span className="block text-xs leading-relaxed text-primary/40">{f.hint}</span>
              </span>
            </label>
          ))}
          <p className="text-xs leading-relaxed text-primary/40">
            На сайте видно сразу после сохранения; для поисковиков — после кнопки «Пересобрать
            сайт».
          </p>
        </div>
      )}
    </div>
  );
}
