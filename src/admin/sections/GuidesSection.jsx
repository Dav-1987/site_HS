import { useSearchParams } from 'react-router-dom';
import { useAdmin } from '../useAdmin.js';
import { formatWhen } from '../formatWhen.js';
import { guideName } from '../guideOps.js';
import { GUIDES_SLUG } from '../../data/guides.js';
import { BTN_GHOST, BTN_SOLID } from '../ui.js';
import GuideEditor from '../components/GuideEditor.jsx';
import SectionPending from './SectionPending.jsx';

const TOPIC_NAMES = {
  tocadores: 'Туалетные столики',
  espejos: 'Зеркала',
  'luz-y-maquillaje': 'Свет и макияж',
};

function GuideList({ guides, dirtyKeys, onOpen, onCreate, onMove }) {
  const now = new Date();
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <button type="button" onClick={onCreate} className={BTN_SOLID}>
          + Новая статья
        </button>
        <p className="max-w-2xl text-sm leading-relaxed text-primary/75">
          Статьи раздела «Guías» на сайте. Правки уходят на сервер кнопкой «Сохранить», на сайте
          появляются после «Пересобрать сайт». Порядок здесь — порядок в списке на сайте.
        </p>
      </div>

      {guides.length === 0 ? (
        <p className="text-sm text-primary/75">Статей пока нет.</p>
      ) : (
        <ol aria-label="Статьи" className="divide-y divide-primary/10 border-y border-primary/10">
          {guides.map((g, i) => (
            <li key={g.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
              <span className="flex gap-2">
                <button
                  type="button"
                  className={BTN_GHOST}
                  disabled={i === 0}
                  onClick={() => onMove(g.key, -1)}
                  aria-label={`«${guideName(g)}» выше`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={BTN_GHOST}
                  disabled={i === guides.length - 1}
                  onClick={() => onMove(g.key, 1)}
                  aria-label={`«${guideName(g)}» ниже`}
                >
                  ↓
                </button>
              </span>
              <button
                type="button"
                onClick={() => onOpen(g.key)}
                className="min-w-0 flex-1 basis-64 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span className="block font-medium text-primary hover:text-accent-text">
                  {guideName(g)}
                </span>
                <span className="block text-xs text-primary/75">
                  /{GUIDES_SLUG}/{g.slug} · {TOPIC_NAMES[g.topic] ?? g.topic}
                  {g.updatedAt && ` · изменена ${formatWhen(g.updatedAt, now)}`}
                </span>
              </button>
              <span className="flex flex-wrap items-center gap-2 text-xs">
                {dirtyKeys.has(g.key) && <span className="text-accent-text">Не сохранена</span>}
                <span
                  className={`border px-2 py-0.5 ${
                    g.visibility === 'public'
                      ? 'border-primary bg-primary text-background'
                      : 'border-primary/30 text-primary'
                  }`}
                >
                  {g.visibility === 'public' ? 'Опубликована' : 'Черновик'}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/**
 * Статьи: the «Guías» articles. The list, or one article open (`?guide=` in
 * the address, so a reload keeps it). The articles live in the admin shell
 * (useGuidesEditor), so an unsaved one survives switching sections.
 */
export default function GuidesSection() {
  const { guides: state, editor } = useAdmin();
  const [params, setParams] = useSearchParams();
  const { guides } = state;

  if (!guides) return <SectionPending error={state.loadError} />;

  const open = guides.find((g) => g.key === params.get('guide'));
  const openGuide = (key) => setParams({ guide: key });
  const back = () => setParams({});

  if (open) {
    return (
      <GuideEditor
        draft={open}
        dirty={state.dirtyKeys.has(open.key)}
        slugError={state.slugError(open.key, open.slug)}
        onChange={(next) => state.update(open.key, next)}
        onRemove={async () => {
          if (await state.remove(open.key)) back();
        }}
        onBack={back}
        categories={editor.categories ?? []}
        allProducts={editor.allProducts ?? []}
      />
    );
  }

  return (
    <GuideList
      guides={guides}
      dirtyKeys={state.dirtyKeys}
      onOpen={openGuide}
      onCreate={() => openGuide(state.create())}
      onMove={state.move}
    />
  );
}
