import { useState } from 'react';
import { translations } from '../../i18n/translations.js';
import { INPUT, LABEL } from '../ui.js';

const TEXT_GROUPS = {
  nav: 'Меню',
  hero: 'Главный экран',
  section: 'Секции главной',
  about: 'Цифры «О нас»',
  catalog: 'Страница каталога',
  category: 'Категория',
  product: 'Карточка товара',
  contact: 'Контакты',
  footer: 'Подвал',
  common: 'Общее',
};
const TEXT_KEYS = Object.keys(translations.es);
const isLongText = (key) => (translations.es[key] || '').length > 60;

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
    <div className="border-t border-primary/5 py-3 first:border-t-0">
      <code className="text-[10px] text-primary/35">{textKey}</code>
      <div className="mt-1 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={LABEL}>ES</span>
          {field('es')}
        </label>
        <label className="block">
          <span className={LABEL}>EN</span>
          {field('en')}
        </label>
      </div>
    </div>
  );
}

function TextGroup({ title, keys, texts, onSet }) {
  const [open, setOpen] = useState(false);
  const edited = keys.filter((k) => texts?.es?.[k] || texts?.en?.[k]).length;
  return (
    <div className="border border-primary/10 bg-background">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className={`text-base transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
        <span className="text-sm uppercase tracking-[0.18em] text-primary/70">{title}</span>
        <span className="ml-auto text-xs text-primary/35">
          {edited > 0 ? `${edited}/${keys.length} изм.` : `${keys.length}`}
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

export default function TextsEditor({ texts, onChange }) {
  const [open, setOpen] = useState(false);
  const setText = (lang, key, val) =>
    onChange({ ...texts, [lang]: { ...texts[lang], [key]: val } });

  const groups = {};
  for (const k of TEXT_KEYS) {
    const g = k.split('.')[0];
    (groups[g] ||= []).push(k);
  }

  return (
    <div className="border border-primary/15 bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <span className={`text-base transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
        <span className="font-serif text-xl font-light text-primary">Тексты сайта</span>
        <span className="text-xs uppercase tracking-[0.18em] text-primary/40">ES / EN</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-primary/10 px-5 py-6">
          <p className="text-xs leading-relaxed text-primary/45">
            Пусто = берётся текст из кода (показан серым как подсказка). Заполните поле,
            чтобы переопределить; очистите — вернётся стандартный текст. Цифры в блоке
            «О нас» — это значения вроде «12+», «100%».
          </p>
          {Object.entries(groups).map(([g, keys]) => (
            <TextGroup key={g} title={TEXT_GROUPS[g] || g} keys={keys} texts={texts} onSet={setText} />
          ))}
        </div>
      )}
    </div>
  );
}
