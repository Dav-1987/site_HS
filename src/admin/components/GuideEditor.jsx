import { useState } from 'react';
import { Field, Select } from './Field.jsx';
import ImageField from './ImageField.jsx';
import Switch from './Switch.jsx';
import GuideLangFields from './GuideLangFields.jsx';
import GuideModelsField from './GuideModelsField.jsx';
import { GUIDE_LANGS, GUIDE_TOPICS, GUIDES_SLUG, missingForPublish } from '../../data/guides.js';
import { brokenProductLinks, missingLines, serviceMentions } from '../guideChecks.js';
import { guideName, linkableProducts } from '../guideOps.js';
import { IMAGE_SPECS } from '../imageSpecs.js';
import { applyUpdate } from '../update.js';
import { BTN_DANGER, BTN_GHOST } from '../ui.js';

const TOPIC_NAMES = {
  tocadores: 'Туалетные столики',
  espejos: 'Зеркала',
  'luz-y-maquillaje': 'Свет и макияж',
};
const LANG_TABS = { es: 'Испанский', en: 'Английский' };

const CARD = 'space-y-5 border border-primary/15 bg-surface p-4 sm:p-6';
const CARD_TITLE = 'font-serif text-xl font-light';

/** What the article needs attention for, above the fields. */
function GuideChecks({ draft, categories }) {
  const missing = missingLines(draft);
  const service = GUIDE_LANGS.flatMap((lang) => {
    const words = serviceMentions(draft[lang], lang);
    return words.length ? [`${LANG_TABS[lang]}: ${words.map((w) => `«${w}»`).join(', ')}`] : [];
  });
  const links = GUIDE_LANGS.flatMap((lang) => brokenProductLinks(draft[lang].body, categories));
  const published = draft.visibility === 'public';

  return (
    <div className="space-y-2 text-sm">
      {missing.length > 0 && (
        <div
          role={published ? 'alert' : undefined}
          className={`border px-4 py-3 ${published ? 'border-danger/45 text-danger' : 'border-primary/15 text-primary'}`}
        >
          <p className="font-medium">
            {published
              ? 'Не сохранится опубликованной — не заполнено:'
              : 'Черновик. Для публикации не хватает:'}
          </p>
          <ul className="mt-1 list-disc pl-5">
            {missing.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      {service.length > 0 && (
        <div className="border border-accent/60 px-4 py-3 text-accent-text">
          <p className="font-medium">
            Статьи раздела не говорят о доставке, сборке, оплате и возврате — в тексте есть:
          </p>
          <ul className="mt-1 list-disc pl-5">
            {service.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      {links.length > 0 && (
        <div className="border border-accent/60 px-4 py-3 text-accent-text">
          <p className="font-medium">Ссылки на товары, которые стоит поправить:</p>
          <ul className="mt-1 list-disc pl-5">
            {links.map((link) => (
              <li key={link.href}>
                {link.href} — {link.why}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * One article in /admin: its address, topic, state, cover, both languages and
 * the models it shows. Edits stay in the admin until the toolbar's «Сохранить»;
 * the page changes after «Пересобрать сайт», like every page of the site.
 */
export default function GuideEditor({
  draft,
  dirty,
  slugError,
  onChange,
  onRemove,
  onBack,
  categories,
  allProducts,
}) {
  const [lang, setLang] = useState('es');
  const set = (patch) => onChange((d) => ({ ...d, ...patch }));
  // One field of the article, merged into the article as it is when the change
  // lands — the cover's upload takes seconds (../update.js).
  const field = (key) => (next) => onChange((d) => ({ ...d, [key]: applyUpdate(next, d[key]) }));
  const products = linkableProducts(categories);
  const missing = missingForPublish(draft);
  const lacks = (l) => missing.some((path) => path.startsWith(`${l}.`));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onBack} className={BTN_GHOST}>
          ← Все статьи
        </button>
        <h2 className="mr-auto min-w-0 font-serif text-2xl font-light">{guideName(draft)}</h2>
        {dirty && <span className="text-xs text-accent-text">Есть несохранённые изменения</span>}
        {draft.publishedAt && (
          <a
            href={`/${GUIDES_SLUG}/${draft.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={BTN_GHOST}
          >
            Открыть на сайте
          </a>
        )}
        <button type="button" onClick={onRemove} className={BTN_DANGER}>
          Удалить
        </button>
      </div>

      <GuideChecks draft={draft} categories={categories} />

      <section className={CARD} aria-label="Основное">
        <h3 className={CARD_TITLE}>Основное</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Field
              label={`Адрес: /${GUIDES_SLUG}/…`}
              value={draft.slug}
              onChange={(slug) => set({ slug: slug.trim().toLowerCase() })}
              readOnly={Boolean(draft.publishedAt)}
            />
            {draft.publishedAt ? (
              <p className="mt-1 text-xs leading-relaxed text-primary/75">
                Адрес закреплён: статья уже публиковалась, и на неё могут ссылаться Google и
                ChatGPT.
              </p>
            ) : (
              slugError && <p className="mt-1 text-xs text-danger">{slugError}</p>
            )}
          </div>
          <Select
            label="Тема — раздел страницы «Guías»"
            value={draft.topic}
            onChange={(topic) => set({ topic })}
            options={GUIDE_TOPICS.map((t) => ({ value: t, label: TOPIC_NAMES[t] ?? t }))}
          />
        </div>
        <Switch
          checked={draft.visibility === 'public'}
          onChange={(on) => set({ visibility: on ? 'public' : 'off' })}
        >
          Опубликована — на сайте после «Сохранить» и «Пересобрать сайт»
        </Switch>
      </section>

      <section className={CARD} aria-label="Обложка">
        <h3 className={CARD_TITLE}>Обложка</h3>
        <ImageField
          value={draft.cover}
          onChange={field('cover')}
          frames={[
            ['16 / 9', 'Список статей'],
            ['4 / 3', 'Статья на телефоне'],
          ]}
          spec={IMAGE_SPECS.guide}
        />
      </section>

      <section className={CARD} aria-label="Тексты на двух языках">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className={`${CARD_TITLE} mr-auto`}>Текст</h3>
          <div role="group" aria-label="Язык" className="flex gap-2">
            {GUIDE_LANGS.map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={lang === l}
                onClick={() => setLang(l)}
                className={`${BTN_GHOST} ${lang === l ? '!border-primary font-semibold' : ''}`}
              >
                {LANG_TABS[l]}
                {lacks(l) && (
                  <span className="text-accent-text">
                    {' '}
                    ·<span className="sr-only"> не всё заполнено</span>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <GuideLangFields
          key={lang}
          lang={lang}
          block={draft[lang]}
          onChange={field(lang)}
          products={products}
        />
      </section>

      <section className={CARD} aria-label="Модели в статье">
        <h3 className={CARD_TITLE}>Модели в статье</h3>
        <GuideModelsField
          rule={draft.products}
          onChange={field('products')}
          categories={categories}
          allProducts={allProducts}
        />
      </section>
    </div>
  );
}
