import { useId, useMemo, useRef, useState } from 'react';
import { renderGuideMarkdown } from '../../guides/markdown.js';
import { GUIDE_PROSE } from '../../guides/prose.js';
import { uploadImage } from '../api.js';
import { BTN_GHOST, INPUT, INPUT_BASE, LABEL } from '../ui.js';

const TOOL = `${BTN_GHOST} !px-3 normal-case tracking-normal`;

const TABLE = '| Columna 1 | Columna 2 |\n|---|---|\n| … | … |\n';

/**
 * The text of an article: Markdown typed with a row of buttons that write the
 * marks for you, and a preview beside it that is the page itself — the same
 * renderer and the same styles (src/guides/markdown.js, prose.js).
 *
 * `products` is `[{ id, name, slug }]` for «Ссылка на товар»: the link is
 * written in its Spanish form, and the English text turns it into /en/… itself.
 */
export default function MarkdownField({ label, value, onChange, lang, products }) {
  const ref = useRef(null);
  const textId = useId();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const preview = useMemo(() => renderGuideMarkdown(value, lang).html, [value, lang]);

  // Replaces the selection with what `edit` makes of it, then puts the cursor
  // after the result. The change goes in as an updater against the text as it
  // is by then — an upload lands seconds later (../update.js).
  const insert = (edit) => {
    const area = ref.current;
    const text = value ?? '';
    const start = area?.selectionStart ?? text.length;
    const end = area?.selectionEnd ?? text.length;
    const replacement = edit(text.slice(start, end), start === 0 || text[start - 1] === '\n');
    onChange((current) => {
      const base = current ?? '';
      const at = Math.min(start, base.length);
      return base.slice(0, at) + replacement + base.slice(Math.min(end, base.length));
    });
    requestAnimationFrame(() => {
      if (!area) return;
      area.focus();
      area.setSelectionRange(start + replacement.length, start + replacement.length);
    });
  };

  const atLineStart = (prefix) => (selected, lineStart) => {
    const lines = (selected || '').split('\n').map((line) => `${prefix}${line}`);
    return `${lineStart ? '' : '\n'}${lines.join('\n')}`;
  };

  const addLink = () => {
    const href = window.prompt(
      'Адрес ссылки: страница сайта (например /tocadores) или https://…',
      '/',
    );
    if (!href) return;
    insert((selected) => `[${selected || 'texto del enlace'}](${href.trim()})`);
  };

  const addProduct = (id) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    insert((selected) => `[${selected || product.name}](/${product.slug}/${product.id})`);
  };

  const addPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const { url } = await uploadImage(file);
      insert((_, lineStart) => `${lineStart ? '' : '\n'}![Descripción de la foto](${url})\n`);
    } catch (err) {
      setUploadError(err.message || 'Ошибка загрузки');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label htmlFor={textId} className={LABEL}>
        {label}
      </label>
      <div role="toolbar" aria-label="Разметка текста" className="mt-1 flex flex-wrap gap-2">
        <button type="button" className={TOOL} onClick={() => insert(atLineStart('## '))}>
          Подзаголовок
        </button>
        <button type="button" className={TOOL} onClick={() => insert((s) => `**${s || 'texto'}**`)}>
          Жирный
        </button>
        <button type="button" className={TOOL} onClick={() => insert(atLineStart('- '))}>
          Список
        </button>
        <button type="button" className={TOOL} onClick={() => insert(atLineStart('1. '))}>
          Нумерованный
        </button>
        <button
          type="button"
          className={TOOL}
          onClick={() => insert((_, lineStart) => `${lineStart ? '' : '\n\n'}${TABLE}`)}
        >
          Таблица
        </button>
        <button type="button" className={TOOL} onClick={addLink}>
          Ссылка
        </button>
        <label className={`${TOOL} cursor-pointer`}>
          {uploading ? 'Загрузка…' : 'Фото'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={addPhoto}
            disabled={uploading}
          />
        </label>
        <select
          aria-label="Ссылка на товар"
          className={`${INPUT_BASE} !w-auto max-w-full`}
          value=""
          onChange={(e) => addProduct(e.target.value)}
        >
          <option value="">Ссылка на товар…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.id})
            </option>
          ))}
        </select>
      </div>
      {uploadError && <p className="mt-2 text-xs text-danger">{uploadError}</p>}

      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <textarea
          id={textId}
          ref={ref}
          rows={24}
          className={`${INPUT} resize-y font-mono !text-[13px] leading-relaxed`}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.12em] text-primary/75">
            Превью — так текст будет выглядеть на сайте
          </p>
          <div
            className={`mt-2 max-h-[38rem] overflow-y-auto border border-primary/15 bg-background p-5 ${GUIDE_PROSE}`}
            dangerouslySetInnerHTML={{ __html: preview }}
          />
        </div>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-primary/75">
        «## » в начале строки — подзаголовок (из них собирается оглавление статьи), **так** —
        жирный, «- » — пункт списка. Ссылки на страницы сайта пишите в испанском виде
        (/tocadores/…): в английском тексте они сами поведут на /en/….
      </p>
    </div>
  );
}
