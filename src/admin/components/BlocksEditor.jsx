import { useState } from 'react';

// Sections of the home page that can be switched off wholesale. Each key maps to
// a flag in settings.blocks (see BLOCKS in src/data/settings.js) that the page
// checks before rendering. Off means the section isn't rendered at all — not
// hidden with CSS — so nothing is left behind in the markup.
const BLOCK_FIELDS = [
  {
    key: 'featured',
    label: 'Избранное',
    hint: 'Карусель избранных товаров на главной (мобильная версия).',
  },
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
  {
    key: 'reviewsHome',
    label: 'Отзывы на главной',
    hint: 'Лента последних отзывов на главной. Страница «Отзывы» остаётся доступной.',
  },
  {
    key: 'reviews',
    label: 'Раздел «Отзывы» целиком',
    hint:
      'Выключает и ленту, и ссылку в меню, и саму страницу /opiniones — после пересборки она отдаёт 404 и уходит из sitemap.',
  },
];

export default function BlocksEditor({ blocks, onChange }) {
  const [open, setOpen] = useState(false);
  const set = (key, value) => onChange({ ...blocks, [key]: value });
  const hiddenCount = BLOCK_FIELDS.filter((f) => blocks?.[f.key] === false).length;

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
