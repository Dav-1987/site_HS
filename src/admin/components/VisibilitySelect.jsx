import { VISIBILITY, visibilityOf } from '../../data/catalog.js';

// One control for both levels — a section and a single product hide the same
// way, so they get the same three options and the same wording (see VISIBILITY
// in src/data/catalog.js for what each state actually does).
const LABELS = {
  public: 'Показывать',
  unlisted: 'Скрыть из списков',
  off: 'Снять с сайта',
};

// Shown next to a collapsed row so hidden entries are recognisable at a glance,
// without opening them. Renders nothing while the entry is public.
const BADGES = {
  unlisted: 'скрыт из списков',
  off: 'снят с сайта',
};

export function VisibilityBadge({ entity }) {
  const text = BADGES[visibilityOf(entity)];
  if (!text) return null;
  return (
    <span className="shrink-0 rounded-sm bg-amber-100 px-2 py-0.5 text-[11px] uppercase tracking-[0.14em] text-amber-700">
      {text}
    </span>
  );
}

// What each non-public state actually does, spelled out where it is set. The
// rebuild caveat is real and worth repeating: /api/catalog updates the live site
// immediately, but crawlers read the prerendered HTML from the last build.
const NOTES = {
  category: {
    unlisted:
      'Ссылок на категорию нет нигде на сайте (меню, главная, каталог, «похожие коллекции»), но её страница открывается по прямой ссылке и остаётся в поиске Google.',
    off: 'Страница категории и страницы всех её товаров отдают 404 и уходят из карты сайта. Данные не удаляются — категорию можно вернуть в любой момент.',
  },
  product: {
    unlisted:
      'Товара нет в сетке своей категории, в «Избранном» и в «Похожих», но его страница открывается по прямой ссылке и остаётся в поиске Google.',
    off: 'Страница товара отдаёт 404 и уходит из карты сайта. Данные не удаляются — товар можно вернуть в любой момент.',
  },
};

/** Explains the current state in place; renders nothing while it is public. */
export function VisibilityNote({ entity, kind }) {
  const note = NOTES[kind]?.[visibilityOf(entity)];
  if (!note) return null;
  return (
    <p className="border-l-2 border-amber-500/60 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
      {note}{' '}
      <span className="text-amber-700/80">
        На сайте видно сразу после сохранения; для поисковиков — после кнопки «Пересобрать сайт».
      </span>
    </p>
  );
}

/**
 * Three-state visibility picker, sized to sit inside a collapsed category or
 * product row so the state can be changed without expanding it.
 */
export default function VisibilitySelect({ value, onChange, title }) {
  const current = visibilityOf({ visibility: value });
  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      title={title}
      aria-label={title}
      className={`shrink-0 border bg-background px-2 py-1.5 text-xs text-primary transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent ${
        current === 'public' ? 'border-primary/15' : 'border-amber-500/60 text-amber-700'
      }`}
    >
      {VISIBILITY.map((v) => (
        <option key={v} value={v}>
          {LABELS[v]}
        </option>
      ))}
    </select>
  );
}
