import Collapsible from './Collapsible.jsx';

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

const HINT = 'block text-xs leading-relaxed text-primary/75';

export default function BlocksEditor({ blocks, onChange }) {
  const set = (key, value) => onChange((b) => ({ ...b, [key]: value }));
  const featuredOn = FEATURED_DEVICES.filter((d) => d.on(blocks?.[d.key]));
  const hiddenCount =
    BLOCK_FIELDS.filter((f) => blocks?.[f.key] === false).length + (featuredOn.length ? 0 : 1);

  return (
    <Collapsible
      title="Блоки главной"
      summary={hiddenCount ? `${hiddenCount} скрыто` : 'все показаны'}
    >
      <fieldset>
        <legend className="block text-sm">Избранное</legend>
        <span className={HINT}>
          Карусель избранных товаров на главной. Выключите обе галочки, чтобы убрать её совсем.
        </span>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
          {FEATURED_DEVICES.map((d) => (
            <label key={d.key} className="flex min-h-11 items-center gap-2 sm:min-h-0">
              <input
                type="checkbox"
                checked={d.on(blocks?.[d.key])}
                onChange={(e) => set(d.key, e.target.checked)}
                className="h-4 w-4 shrink-0 accent-primary"
              />
              <span className="text-sm">{d.label}</span>
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
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          />
          <span>
            <span className="block text-sm">{f.label}</span>
            <span className={HINT}>{f.hint}</span>
          </span>
        </label>
      ))}
      <p className="text-xs leading-relaxed text-primary/75">
        На сайте видно сразу после сохранения; для поисковиков — после кнопки «Пересобрать сайт».
      </p>
    </Collapsible>
  );
}
