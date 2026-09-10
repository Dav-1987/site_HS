import { useEffect, useMemo, useState } from 'react';
import { BTN_GHOST, BTN_SOLID, INPUT, LABEL } from '../admin/ui.js';
import {
  FIELDS,
  PAGES,
  SCENARIOS,
  buildLink,
  examplesFor,
  fieldIssue,
  normalizePath,
  orderPreview,
  parseLink,
} from '../utm/spec.js';

/**
 * Генератор рекламных ссылок — внутренний инструмент, как /admin: без шапки
 * сайта, по-русски, из поиска закрыт (robots.txt + noindex ниже, и адрес не
 * попадает ни в prerender, ни в карту сайта — см. src/routes.js).
 *
 * Правила разметки живут в src/utm/spec.js и проверены тестами; здесь только
 * форма и подсказки к ней. Подсказки меняются вместе со сценарием: в рекламном
 * кабинете уместны макросы `{{...}}`, а в шапке профиля тот же макрос приедет в
 * заявку буквально — и человеку об этом надо сказать до того, как он вставит
 * ссылку, а не после первой заявки.
 *
 * Телефон здесь не «тоже поддерживается», а основной сценарий: ссылку обычно
 * делают там же, где потом вставляют, — в приложении рекламного кабинета. На
 * узком экране колонка одна, а готовая ссылка и кнопка «Скопировать» держатся
 * полосой у нижнего края, чтобы за ними не приходилось листать всю форму.
 */

const STORE_KEY = 'hs-utm-builder';
const UNLOCK_KEY = 'hs-utm-unlocked';

// Код на входе. Он лежит прямо здесь, а значит виден любому, кто откроет
// исходник страницы: это не замок, а табличка «служебное помещение» — чтобы
// случайно зашедший человек развернулся. Так и задумано: на этой странице нет
// ни данных клиентов, ни кнопок, меняющих сайт, и худшее, что сделает
// посторонний, — соберёт себе ссылку на этот же магазин. Если когда-нибудь тут
// появится что-то настоящее, закрывать надо сессией админки (см. Admin.jsx):
// там пароль проверяется на сервере и в коде не лежит.
const CODE = '777111';

function readUnlocked() {
  try {
    return localStorage.getItem(UNLOCK_KEY) === CODE;
  } catch {
    return false;
  }
}

/** Экран с кодом. Пускает один раз — дальше страница помнит, что открыта. */
function CodeScreen({ onUnlock }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (value.trim() !== CODE) {
      setError(true);
      return;
    }
    try {
      localStorage.setItem(UNLOCK_KEY, CODE);
    } catch {
      // Не запомнится — код спросят в следующий раз, страница работает.
    }
    onUnlock();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-xs border border-primary/10 bg-background p-6"
      >
        <p className="text-xs uppercase tracking-[0.28em] text-accent-text">hsmuebles.es</p>
        <h1 className="mt-1 font-serif text-2xl font-light text-primary">Генератор ссылок</h1>
        <label htmlFor="utm-code" className="mt-4 block">
          <span className={LABEL}>Код доступа</span>
          <input
            id="utm-code"
            className={INPUT}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(false);
            }}
          />
        </label>
        {error && <p className="mt-2 text-xs text-danger">Неверный код.</p>}
        <button type="submit" className={`${BTN_SOLID} mt-4 w-full justify-center`}>
          Войти
        </button>
      </form>
    </div>
  );
}

// Подсказка под полем в двух видах: для рекламного кабинета и для всего
// остального. Это копирайт, а не правила, поэтому живёт рядом с формой.
const HINTS = {
  source: {
    macros:
      'Где вы дали ссылку. Для рекламы в Meta оставьте макрос {{site_source_name}} — она сама подставит ig, fb, an или msg, и в заявке будет видно, Instagram это был или Facebook.',
    plain:
      'Где вы дали ссылку: площадка, а не страница. Только маленькие буквы, латиницей. Названия из примеров сайт подписывает в заявке по-человечески.',
  },
  medium: {
    macros:
      'Тип трафика. Для любой платной рекламы — cpc: именно по этому слову аналитика отличает рекламу от бесплатного трафика. Напишете своё — реклама попадёт в отчёт как органика.',
    plain:
      'Тип трафика. Для бесплатных публикаций — social, для рассылки — email, для досок объявлений — marketplace. Слово cpc оставьте только платной рекламе.',
  },
  campaign: {
    macros:
      'Название акции — придумываете сами, латиницей через дефис. Одно и то же во всех объявлениях запуска, иначе он разъедется в отчёте на несколько строк.',
    plain:
      'Название акции — придумываете сами, латиницей через дефис. Одно и то же во всех ссылках запуска, иначе он разъедется в отчёте на несколько строк.',
  },
  content: {
    macros:
      'Какое именно объявление сработало. Макрос {{ad.name}} приедет названием объявления из кабинета, {{ad.id}} — его номером. Понятное имя читается в заявке лучше номера.',
    plain:
      'Что именно человек нажал, если ссылок в этом месте несколько. Одна ссылка — поле можно оставить пустым.',
  },
  term: {
    macros:
      'Где показалось объявление. У Meta — макрос {{placement}}: в заявке будет Instagram_Stories, Facebook_Feed и т. п. У Google сюда обычно ставят ключевое слово {keyword}.',
    plain: 'Нужен только в рекламе — там сюда попадает место показа или ключевое слово.',
  },
};

const FIELD_LABEL = {
  source: 'utm_source',
  medium: 'utm_medium',
  campaign: 'utm_campaign',
  content: 'utm_content',
  term: 'utm_term',
};

const OPTIONAL = ['content', 'term'];
const EMPTY = { source: '', medium: '', campaign: '', content: '', term: '' };
const SECTIONS = PAGES.filter(([value]) => value !== 'custom');

function readStored() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || !SCENARIOS[parsed.scenario]) return null;
    return parsed;
  } catch {
    // Приватный режим или выключенное хранилище: поля просто не запомнятся.
    return null;
  }
}

/** Кнопка-пример под полем: нажали — значение встало в поле. */
function Example({ value, onPick }) {
  return (
    <button
      type="button"
      onClick={() => onPick(value)}
      title="Подставить в поле"
      className="min-h-9 border border-primary/15 px-2 py-1 font-mono text-xs text-primary/60 transition-colors hover:border-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {value}
    </button>
  );
}

export default function UtmBuilder() {
  const [unlocked, setUnlocked] = useState(readUnlocked);
  const stored = useMemo(readStored, []);
  const [scenario, setScenario] = useState(stored?.scenario ?? 'meta');
  const [page, setPage] = useState(stored?.page ?? SCENARIOS.meta.values.page);
  const [values, setValues] = useState(() => ({
    ...EMPTY,
    ...(stored?.values ?? { ...SCENARIOS.meta.values, page: undefined, campaign: 'hov' }),
  }));
  const [source, setSource] = useState('');
  const [parseError, setParseError] = useState('');
  const [copied, setCopied] = useState(false);

  const sc = SCENARIOS[scenario];

  // Страница внутренняя: robots.txt её и так закрывает, но мета-тег отвечает и
  // за тот случай, когда до неё дошли по прямой ссылке из чужого браузера.
  useEffect(() => {
    document.title = 'Генератор UTM — Mirage Muebles';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ scenario, page, values }));
    } catch {
      // См. readStored — потеря черновика не повод ломать страницу.
    }
  }, [scenario, page, values]);

  const set = (field, value) => setValues((v) => ({ ...v, [field]: value }));

  const chooseScenario = (key) => {
    const next = SCENARIOS[key];
    setScenario(key);
    setPage(next.values.page);
    setValues({ ...EMPTY, ...next.values, page: undefined });
    setParseError('');
  };

  const { link, pairs, path } = buildLink({ page, values });
  const issues = FIELDS.map((f) => [f, fieldIssue(f, values[f], scenario)]).filter(([, m]) => m);
  const order = orderPreview({ scenario, page, values });

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Буфер недоступен (старый браузер, http) — ссылка на экране, её видно.
      setCopied(false);
    }
  };

  const applyParsed = () => {
    const parsed = parseLink(source);
    if (!parsed) {
      setParseError('В этой ссылке нет UTM-меток — сайт запишет заход как прямой.');
      return;
    }
    setParseError('');
    setPage(parsed.page);
    setValues({ ...EMPTY, ...parsed.values });
  };

  const linkBody =
    pairs.length === 0 ? (
      <span className="font-sans text-primary/45">
        Заполните источник, тип трафика и кампанию — ссылка появится здесь.
      </span>
    ) : (
      <>
        {`https://hsmuebles.es${path}?`}
        {pairs.map(([key, value], i) => (
          <span key={key}>
            {i > 0 && '&'}
            <span className="text-accent-text">{key}=</span>
            {value}
          </span>
        ))}
      </>
    );

  if (!unlocked) return <CodeScreen onUnlock={() => setUnlocked(true)} />;

  return (
    <div className="min-h-screen bg-background text-primary">
      <header className="border-b border-primary/10 px-4 py-5 sm:px-8">
        <p className="text-xs uppercase tracking-[0.28em] text-accent-text">
          hsmuebles.es · инструмент
        </p>
        <h1 className="mt-1 font-serif text-2xl font-light sm:text-3xl">
          Генератор ссылок с UTM-метками
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-primary/60">
          Выберите, куда даёте ссылку, и заполните поля — под каждым написано, что в него годится.
          Готовую ссылку скопируйте и вставьте туда, где она нужна.
        </p>
      </header>

      <main className="mx-auto grid max-w-6xl gap-5 px-4 pb-32 pt-5 sm:px-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-6 lg:pb-8">
        <div className="space-y-5">
          <section className="border border-primary/10 bg-surface p-4 sm:p-5">
            <h2 className={LABEL}>1. Куда даёте ссылку</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {Object.entries(SCENARIOS).map(([key, item]) => {
                const active = key === scenario;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => chooseScenario(key)}
                    aria-pressed={active}
                    className={`flex min-h-12 flex-col items-start justify-center gap-0.5 border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      active
                        ? 'border-accent bg-background text-primary'
                        : 'border-primary/15 text-primary/60 hover:border-accent hover:text-primary'
                    }`}
                  >
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="text-xs text-primary/45">{item.sub}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-primary/50">{sc.note}</p>
          </section>

          <section className="border border-primary/10 bg-surface p-4 sm:p-5">
            <h2 className={LABEL}>2. Куда ведёт ссылка</h2>
            <label
              htmlFor="utm-page"
              className="mt-2 block text-xs leading-relaxed text-primary/50"
            >
              Вставьте адрес страницы прямо из адресной строки — товара, категории, любой. Лишнее
              (свои параметры, хвостовой слэш) уберётся само. Пусто — главная.
            </label>
            <input
              id="utm-page"
              className={INPUT}
              value={page}
              onChange={(e) => setPage(e.target.value)}
              placeholder="https://hsmuebles.es/tocadores/Tocador-L-01"
              spellCheck={false}
              autoComplete="off"
              inputMode="url"
            />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-primary/40">Разделы:</span>
              {SECTIONS.map(([value, title]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPage(value)}
                  className={`min-h-9 border px-2 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    normalizePath(page) === value
                      ? 'border-accent text-primary'
                      : 'border-primary/15 text-primary/60 hover:border-accent hover:text-primary'
                  }`}
                >
                  {title}
                </button>
              ))}
            </div>
          </section>

          <section className="border border-primary/10 bg-surface p-4 sm:p-5">
            <h2 className={LABEL}>3. Заполните метки</h2>
            <div className="mt-4 space-y-5">
              {FIELDS.map((field) => {
                const issue = fieldIssue(field, values[field], scenario);
                const examples = examplesFor(field, scenario);
                return (
                  <div key={field}>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <label
                        htmlFor={`utm-${field}`}
                        className="font-mono text-sm font-medium text-primary"
                      >
                        {FIELD_LABEL[field]}
                      </label>
                      <span
                        className={`rounded-full border px-2 text-[10px] uppercase tracking-[0.1em] ${
                          OPTIONAL.includes(field)
                            ? 'border-primary/15 text-primary/40'
                            : 'border-accent/40 text-accent-text'
                        }`}
                      >
                        {OPTIONAL.includes(field) ? 'можно пропустить' : 'нужна'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-primary/50">
                      {sc.macros ? HINTS[field].macros : HINTS[field].plain}
                    </p>
                    <input
                      id={`utm-${field}`}
                      className={INPUT}
                      value={values[field]}
                      onChange={(e) => set(field, e.target.value)}
                      spellCheck={false}
                      autoComplete="off"
                    />
                    {examples.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-primary/40">Например:</span>
                        {examples.map((example) => (
                          <Example key={example} value={example} onPick={(v) => set(field, v)} />
                        ))}
                      </div>
                    )}
                    {issue && <p className="mt-1.5 text-xs text-danger">{issue}</p>}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="border border-primary/10 bg-surface p-4 sm:p-5">
            <h2 className={LABEL}>Разобрать готовую ссылку</h2>
            <p className="mt-2 text-xs leading-relaxed text-primary/50">
              Вставьте ссылку, которая у вас уже где-то стоит, — поля заполнятся из неё, и станет
              видно, что с ней не так.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                className={`${INPUT} min-w-0 flex-1`}
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="https://hsmuebles.es/tocadores?utm_source=…"
                aria-label="Готовая ссылка"
                spellCheck={false}
                inputMode="url"
              />
              <button type="button" onClick={applyParsed} className={`${BTN_GHOST} shrink-0`}>
                Разобрать
              </button>
            </div>
            {parseError && <p className="mt-1.5 text-xs text-danger">{parseError}</p>}
          </section>
        </div>

        {/* Правая колонка — только на широком экране: на телефоне то же самое
            показывает полоса внизу, иначе результат уезжает под форму. */}
        <div className="hidden space-y-5 lg:sticky lg:top-6 lg:block">
          <section className="border border-primary/10 bg-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className={LABEL}>Готовая ссылка</h2>
              <span className="text-xs text-primary/45">{sc.target}</span>
            </div>
            <div className="mt-3 break-all border border-primary/10 bg-background p-3 font-mono text-xs leading-relaxed sm:text-sm">
              {linkBody}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={copy} className={BTN_SOLID} disabled={!link}>
                {copied ? 'Скопировано' : 'Скопировать'}
              </button>
              <button type="button" onClick={() => setValues({ ...EMPTY })} className={BTN_GHOST}>
                Очистить
              </button>
            </div>
            <p
              className={`mt-3 border-l-2 px-3 py-2 text-xs leading-relaxed ${
                issues.length ? 'border-danger bg-danger/5' : 'border-sale bg-sale/5'
              } text-primary/80`}
            >
              {issues.length
                ? `Поля, которые просят внимания: ${issues
                    .map(([field]) => FIELD_LABEL[field])
                    .join(', ')}.`
                : 'Всё в порядке — можно копировать.'}
            </p>
          </section>

          <section className="border border-primary/10 bg-surface p-4 sm:p-5">
            <h2 className={LABEL}>Так это придёт в заявку</h2>
            <div className="mt-3 border-l-2 border-accent bg-background px-3 py-2 font-mono text-xs leading-loose sm:text-sm">
              <div>
                <span className="text-accent-text">Fuente: </span>
                {order.fuente}
              </div>
              {order.anuncio && (
                <div>
                  <span className="text-accent-text">Anuncio: </span>
                  {order.anuncio}
                </div>
              )}
              <div>
                <span className="text-accent-text">Entrada: </span>
                {order.entrada}
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-primary/50">
              Эти строки увидите вы — в Telegram и в разделе «Заявки». Источник запоминается на 90
              дней: человек может уйти и вернуться через неделю, заявка всё равно принесёт эту
              кампанию.
            </p>
          </section>
        </div>

        {/* Телефон: результат всегда на экране, под большим пальцем. */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-primary/15 bg-surface px-4 py-3 shadow-[0_-6px_20px_-12px_rgba(43,43,43,0.35)] lg:hidden">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 break-all font-mono text-[11px] leading-snug text-primary/80">
                {linkBody}
              </div>
              <p
                className={`mt-1 text-[11px] leading-snug ${
                  issues.length ? 'text-danger' : 'text-primary/45'
                }`}
              >
                {issues.length
                  ? `Проверьте: ${issues.map(([field]) => FIELD_LABEL[field]).join(', ')}`
                  : sc.target}
              </p>
            </div>
            <button
              type="button"
              onClick={copy}
              className={`${BTN_SOLID} shrink-0`}
              disabled={!link}
            >
              {copied ? 'Готово' : 'Копировать'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
