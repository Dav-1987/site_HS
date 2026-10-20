import { useState } from 'react';
import { translations } from '../../i18n/translations.js';
import { INPUT, LABEL } from '../ui.js';
import { normalizeSearch } from '../catalogView.js';
import { groupTexts } from '../textGroups.js';
import SearchBox from './SearchBox.jsx';

const TEXT_KEYS = Object.keys(translations.es);
const isLongText = (key) => (translations.es[key] || '').length > 60;
const GROUPS = groupTexts(TEXT_KEYS);

/**
 * True when the query is in the key, in the site's own text (either language)
 * or in the override typed here — the owner searches for the words they see
 * on the page, not for "hero.subtitle".
 */
function matchesText(key, texts, query) {
  const q = normalizeSearch(query);
  if (!q) return true;
  return normalizeSearch(
    [key, translations.es[key], translations.en[key], texts?.es?.[key], texts?.en?.[key]].join(' '),
  ).includes(q);
}

function TextRow({ textKey, texts, onSet }) {
  const long = isLongText(textKey);
  const field = (lang) => {
    const props = {
      className: `${INPUT} ${long ? 'resize-y' : ''}`,
      value: texts?.[lang]?.[textKey] ?? '',
      placeholder: translations[lang][textKey],
      onChange: (e) => onSet(lang, textKey, e.target.value),
    };
    return long ? <textarea rows={2} {...props} /> : <input {...props} />;
  };
  return (
    <div className="border-t border-primary/10 py-3 first:border-t-0">
      <code className="text-xs text-primary/75">{textKey}</code>
      <div className="mt-1 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={`${LABEL} notranslate`} translate="no">
            ES
          </span>
          {field('es')}
        </label>
        <label className="block">
          <span className={`${LABEL} notranslate`} translate="no">
            EN
          </span>
          {field('en')}
        </label>
      </div>
    </div>
  );
}

const edited = (keys, texts) => keys.filter((k) => texts?.es?.[k] || texts?.en?.[k]).length;

export default function TextsEditor({ texts, onChange }) {
  const [query, setQuery] = useState('');
  const setText = (lang, key, val) =>
    onChange((t) => ({ ...t, [lang]: { ...t?.[lang], [key]: val } }));
  const total = edited(TEXT_KEYS, texts);
  const searching = Boolean(normalizeSearch(query));
  const found = searching ? TEXT_KEYS.filter((k) => matchesText(k, texts, query)) : [];

  // The section's own heading names the screen, so this is its body alone — it
  // used to sit in a fold titled «Тексты сайта» under that same heading.
  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-sm leading-relaxed text-primary/75">
        Пусто = берётся текст из кода (показан серым как подсказка). Заполните поле, чтобы
        переопределить; очистите — вернётся стандартный текст. Напишите{' '}
        <code className="bg-primary/10 px-1">---</code> чтобы скрыть текст на сайте полностью.
      </p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <SearchBox
          label="Поиск по текстам"
          value={query}
          onChange={setQuery}
          placeholder="Слова с сайта, например «Entrega»"
          className="flex-1 basis-72 lg:max-w-xl"
        />
        <p className="text-sm tabular-nums text-primary/75">
          {total ? `Изменено: ${total} из ${TEXT_KEYS.length}` : 'Все тексты — из кода'}
        </p>
      </div>

      {searching ? (
        <div className="border border-primary/15 bg-surface px-4 py-1">
          {found.length ? (
            found.map((k) => <TextRow key={k} textKey={k} texts={texts} onSet={setText} />)
          ) : (
            <p className="py-3 text-sm text-primary/75">Ничего не нашлось.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {GROUPS.map((g) => (
            <TextGroup key={g.prefix} title={g.title} keys={g.keys} texts={texts} onSet={setText} />
          ))}
        </div>
      )}
    </div>
  );
}

function TextGroup({ title, keys, texts, onSet }) {
  const [open, setOpen] = useState(false);
  const count = edited(keys, texts);
  return (
    <div className="border border-primary/15 bg-surface">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-sm font-medium">{title}</span>
        <span className="ml-auto text-xs tabular-nums text-primary/75">
          {count > 0 ? `${count}/${keys.length} изм.` : keys.length}
        </span>
      </button>
      {open && (
        <div className="border-t border-primary/10 px-4 py-1">
          {keys.map((k) => (
            <TextRow key={k} textKey={k} texts={texts} onSet={onSet} />
          ))}
        </div>
      )}
    </div>
  );
}
