import { Field, TextArea } from './Field.jsx';
import MarkdownField from './MarkdownField.jsx';
import { keywordCoverage } from '../guideChecks.js';
import { GUIDE_LIMITS } from '../../data/guides.js';
import { applyUpdate } from '../update.js';
import { BTN_GHOST, LABEL } from '../ui.js';

// What Google shows of a title and a description before cutting them.
const TITLE_SHOWN = 60;
const DESCRIPTION_SHOWN = 160;

function Count({ value, shown }) {
  const n = (value ?? '').length;
  return (
    <span className={`text-xs ${n > shown ? 'text-accent-text' : 'text-primary/75'}`}>
      {n} / {shown} знаков{n > shown ? ' — Google покажет не всё' : ''}
    </span>
  );
}

const Mark = ({ ok }) => (
  <td className={`px-2 py-1.5 text-center ${ok ? 'text-primary' : 'text-accent-text'}`}>
    {ok ? '✓' : '—'}
    <span className="sr-only">{ok ? ' есть' : ' нет'}</span>
  </td>
);

/** The searches the article is written for, and where each one already is. */
function KeywordsField({ block, onChange }) {
  const coverage = keywordCoverage({
    ...block,
    keywords: block.keywords.filter((k) => k.trim()),
  });
  return (
    <div>
      <TextArea
        label="Ключевые запросы — по одному в строке, как их набирают в поиске"
        rows={3}
        value={block.keywords.join('\n')}
        onChange={(text) => onChange({ keywords: text.split('\n') })}
        placeholder={'medidas de un tocador\ntocador 80 cm ancho'}
      />
      <p className="mt-2 text-xs leading-relaxed text-primary/75">
        На сайте их не видно. Главный запрос стоит поставить в заголовок, описание и первые слова
        короткого ответа — их поисковики и ИИ читают первыми.
      </p>
      {coverage.length > 0 && (
        <table className="mt-3 w-full max-w-xl border-collapse text-sm">
          <thead>
            <tr className="border-b border-primary/15 text-xs text-primary/75">
              <th className="py-1.5 pr-2 text-left font-normal">Запрос</th>
              <th className="px-2 py-1.5 font-normal">Заголовок</th>
              <th className="px-2 py-1.5 font-normal">Описание</th>
              <th className="px-2 py-1.5 font-normal">Короткий ответ</th>
            </tr>
          </thead>
          <tbody>
            {coverage.map((c) => (
              <tr key={c.keyword} className="border-b border-primary/10">
                <td className="py-1.5 pr-2">{c.keyword}</td>
                <Mark ok={c.title} />
                <Mark ok={c.description} />
                <Mark ok={c.answer} />
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** «Вопросы и ответы»: shown at the end of the article and marked up for Google. */
function FaqField({ faq, onChange }) {
  const set = (i, patch) =>
    onChange(faq.map((item, j) => (j === i ? { ...item, ...patch } : item)));
  const move = (i, dir) => {
    const next = [...faq];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };
  return (
    <div>
      <p className={LABEL}>Вопросы и ответы — в конце статьи</p>
      <div className="mt-2 space-y-3">
        {faq.map((item, i) => (
          <div key={i} className="space-y-2 border border-primary/15 bg-background p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-primary/75">Вопрос {i + 1}</span>
              <span className="ml-auto flex gap-2">
                <button
                  type="button"
                  className={BTN_GHOST}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  aria-label={`Вопрос ${i + 1} выше`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={BTN_GHOST}
                  disabled={i === faq.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label={`Вопрос ${i + 1} ниже`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center text-sm text-danger hover:underline sm:min-h-0 sm:min-w-0 sm:px-2"
                  onClick={() => onChange(faq.filter((_, j) => j !== i))}
                  aria-label={`Убрать вопрос ${i + 1}`}
                >
                  ×
                </button>
              </span>
            </div>
            <Field label="Вопрос" value={item.q} onChange={(q) => set(i, { q })} />
            <TextArea label="Ответ" rows={2} value={item.a} onChange={(a) => set(i, { a })} />
          </div>
        ))}
      </div>
      <button
        type="button"
        className={`${BTN_GHOST} mt-3`}
        disabled={faq.length >= GUIDE_LIMITS.faq}
        onClick={() => onChange([...faq, { q: '', a: '' }])}
      >
        + Добавить вопрос
      </button>
    </div>
  );
}

/**
 * One language of an article. `onChange` takes a patch of the language block
 * or an updater of it, merged into the block as it is when it lands.
 */
export default function GuideLangFields({ lang, block, onChange, products }) {
  const set = (patch) => onChange((b) => ({ ...b, ...patch }));
  return (
    <div className="space-y-6">
      <div>
        <Field
          label="Заголовок — он же заголовок страницы в Google"
          value={block.title}
          onChange={(title) => set({ title })}
          maxLength={GUIDE_LIMITS.title}
        />
        <Count value={block.title} shown={TITLE_SHOWN} />
      </div>
      <div>
        <TextArea
          label="Описание для Google и превью ссылки"
          rows={2}
          value={block.description}
          onChange={(description) => set({ description })}
          maxLength={GUIDE_LIMITS.description}
        />
        <Count value={block.description} shown={DESCRIPTION_SHOWN} />
      </div>
      <KeywordsField block={block} onChange={set} />
      <TextArea
        label="Короткий ответ — первый абзац статьи, 2–3 предложения с прямым ответом"
        rows={4}
        value={block.answer}
        onChange={(answer) => set({ answer })}
        maxLength={GUIDE_LIMITS.answer}
      />
      <MarkdownField
        label="Текст статьи"
        lang={lang}
        value={block.body}
        onChange={(next) => onChange((b) => ({ ...b, body: applyUpdate(next, b.body) }))}
        products={products}
      />
      <FaqField faq={block.faq} onChange={(faq) => set({ faq })} />
      <Field
        label="Подпись к обложке (alt) — что на фото, для поиска по картинкам"
        value={block.coverAlt}
        onChange={(coverAlt) => set({ coverAlt })}
        maxLength={GUIDE_LIMITS.coverAlt}
      />
    </div>
  );
}
