import { formatDuration, formatWhen } from '../formatWhen.js';
import { BTN_GHOST } from '../ui.js';

// Why the server log has nothing for an order (server/visit.js).
const REASONS = {
  expired: 'Журнал за тот день уже удалён: сервер хранит его 14 дней.',
  not_found: 'В журнале сервера нет отправки этой заявки, подробностей не найти.',
  no_logs: 'Журнал сервера недоступен.',
};

function plural(n, [one, few, many]) {
  const tens = n % 100;
  const units = n % 10;
  if (units === 1 && tens !== 11) return one;
  if (units >= 2 && units <= 4 && (tens < 12 || tens > 14)) return few;
  return many;
}

const clock = (iso) =>
  new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

/** Opens and folds the details; `visit` is useOrderVisit()'s. */
export function VisitButton({ visit, panelId }) {
  return (
    <button
      type="button"
      aria-expanded={visit.open}
      aria-controls={panelId}
      onClick={visit.toggle}
      className={`mt-2 ${BTN_GHOST}`}
    >
      {visit.open ? 'Скрыть подробности' : 'Подробности визита'}
    </button>
  );
}

function eventText(event, index) {
  if (event.type === 'order') return 'Отправили заявку';
  if (event.type === 'photos') return `Открыли крупно ${event.count} фото из ${event.total}`;
  return index === 0 ? `Вход: ${event.label}` : event.label;
}

function EarlierVisits({ visit, now }) {
  if (!visit.earlierCount) return <p>Раньше за 14 дней не заходили.</p>;
  const more = visit.earlierCount - visit.earlierVisits.length;
  return (
    <div>
      <p>
        Раньше заходили {visit.earlierCount} {plural(visit.earlierCount, ['раз', 'раза', 'раз'])} за
        14 дней:
      </p>
      <ul className="mt-1 space-y-0.5">
        {visit.earlierVisits.map((v) => (
          <li key={v.start}>
            {formatWhen(v.start, now)}: {v.pages.join(', ')}
            {v.ordered && ' · оставили заявку'}
          </li>
        ))}
        {more > 0 && <li>и ещё {more}</li>}
      </ul>
    </div>
  );
}

function VisitBody({ result, now }) {
  const { visit, reason } = result;
  if (!visit) return <p>{REASONS[reason] ?? REASONS.not_found}</p>;
  const facts = [
    `На сайте ${formatDuration(new Date(visit.orderAt) - new Date(visit.start))} до заявки`,
    visit.provider &&
      `Интернет: ${visit.provider.name}${visit.provider.name !== visit.provider.domain ? ` (${visit.provider.domain})` : ''}`,
  ].filter(Boolean);
  return (
    <>
      <ol className="space-y-1">
        {visit.events.map((event, i) => (
          <li key={`${i}-${event.type}`} className="flex gap-3">
            <time dateTime={event.at} className="w-[4.75rem] shrink-0 tabular-nums text-primary/75">
              {clock(event.at)}
            </time>
            <span className="min-w-0 break-words">{eventText(event, i)}</span>
          </li>
        ))}
      </ol>
      <div className="mt-3 space-y-1 text-primary/75">
        <p>{facts.join(' · ')}</p>
        <EarlierVisits visit={visit} now={now} />
        <p className="text-xs">
          По журналу сервера: тот же интернет-адрес и браузер, что у заявки.
        </p>
      </div>
    </>
  );
}

/** The opened details, a row of their own under the order. */
export function VisitPanel({ visit, id, name, now }) {
  const { state } = visit;
  return (
    <section
      id={id}
      aria-label={`Подробности визита: ${name}`}
      aria-busy={state.status === 'loading'}
      className="border-l-2 border-accent bg-surface px-4 py-3 text-sm lg:col-span-full"
    >
      {state.status === 'loading' && <p aria-live="polite">Читаю журнал сервера…</p>}
      {state.status === 'failed' && (
        <p className="text-danger">
          Не удалось получить подробности: {state.error}.{' '}
          <button type="button" onClick={visit.retry} className="underline underline-offset-2">
            Ещё раз
          </button>
        </p>
      )}
      {state.status === 'done' && <VisitBody result={state.result} now={now} />}
    </section>
  );
}
