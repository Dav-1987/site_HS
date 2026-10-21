import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { productImages, resolveImage } from '../../data/catalog.js';
import { getCountryName } from '../../../server/order-data.js';
import { STATUS_OPTIONS, contactLinks } from '../orderView.js';
import { formatWhen } from '../formatWhen.js';
import { BTN_GHOST, BTN_SOLID } from '../ui.js';
import OverflowMenu, { MenuItem } from './OverflowMenu.jsx';
import { useOrderVisit } from '../useOrderVisit.js';
import { VisitButton, VisitPanel } from './VisitDetails.jsx';

// Each status reads apart by more than its hue: filled gold (to call), an
// outline (waiting), filled dark (agreed), quiet (done), red outline (lost),
// dashed (from before statuses existed).
const STATUS_LOOK = {
  new: 'border-accent bg-accent text-primary',
  called: 'border-primary bg-background text-primary',
  confirmed: 'border-primary bg-primary text-background',
  delivered: 'border-primary/30 bg-surface text-primary',
  refused: 'border-danger bg-background text-danger',
  none: 'border-dashed border-primary/45 bg-background text-primary/80',
};

function StatusSelect({ order, onChange }) {
  const id = useId();
  const status = order.status ?? 'none';
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        Статус заявки от {order.name}
      </label>
      <select
        id={id}
        value={status}
        onChange={(e) => onChange(e.target.value)}
        // Drawn without the browser's arrow, which would vanish on the dark
        // «Подтверждена»; the chevron below takes the text colour.
        className={`min-h-11 w-full cursor-pointer appearance-none border py-1.5 pl-3 pr-8 text-base font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 sm:min-h-0 sm:text-sm ${STATUS_LOOK[status]}`}
      >
        {status === 'none' && (
          <option value="none" disabled>
            Без статуса
          </option>
        )}
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
        className={`pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 ${
          status === 'confirmed' ? 'text-background' : 'text-primary'
        }`}
      >
        <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// How long typing may pause before the note is saved anyway — and it is saved
// on leaving the field whatever the pause.
const NOTE_SAVE_MS = 1200;

/** The owner's note on an order, saved by itself (see useOrders' update). */
function NoteField({ order, onSave, className = '' }) {
  const [draft, setDraft] = useState(order.note ?? '');
  const [state, setState] = useState('idle'); // idle | saving | saved | failed
  const saved = useRef(order.note ?? '');
  const timer = useRef(null);
  const id = useId();

  const save = async (value) => {
    clearTimeout(timer.current);
    if (value === saved.current) return;
    setState('saving');
    const ok = await onSave(value);
    if (ok) saved.current = value;
    setState(ok ? 'saved' : 'failed');
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className={className}>
      <label htmlFor={id} className="sr-only">
        Заметка к заявке от {order.name}
      </label>
      <textarea
        id={id}
        rows={2}
        value={draft}
        placeholder="Заметка: как прошёл звонок, дата доставки"
        onChange={(e) => {
          const value = e.target.value;
          setDraft(value);
          setState('idle');
          clearTimeout(timer.current);
          timer.current = setTimeout(() => save(value), NOTE_SAVE_MS);
        }}
        onBlur={() => save(draft)}
        className="block min-h-11 w-full resize-y border border-primary/30 bg-background px-3 py-2 text-base text-primary placeholder:text-secondary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
      />
      <p aria-live="polite" className="mt-1 min-h-4 text-xs text-primary/75">
        {state === 'saving' && 'Сохраняется…'}
        {state === 'saved' && 'Заметка сохранена'}
        {state === 'failed' && (
          <span className="text-danger">Не сохранилось — попробуйте ещё раз</span>
        )}
      </p>
    </div>
  );
}

// Whether the order reached the owner when it came in: a request that never
// arrived by Telegram or email is one nobody knew to call about.
function Notified({ order }) {
  const channels = [order.telegramSent && 'в Telegram', order.emailSent && 'на email'].filter(
    Boolean,
  );
  if (!channels.length) {
    return <span className="block text-xs text-danger">Уведомление не дошло</span>;
  }
  return <span className="block text-xs">Пришла {channels.join(' и ')}</span>;
}

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * One order, as a row on a wide screen and a stacked block on a phone:
 * where it stands, who to call, what they want, where it goes and how they
 * came, and the owner's note. `product` is the catalog's own product for it,
 * when it still exists — for the photo and the link.
 */
export default function OrderRow({ order, product, now, deleting, onUpdate, onRemove }) {
  const { tel, whatsapp } = contactLinks(order);
  const isNew = order.status === 'new';
  const visit = useOrderVisit(order.id);
  const visitPanelId = useId();
  const cover = product && productImages(product)[0];
  const place = [order.postalCode, order.address].filter(Boolean).join(', ');
  const country = order.country
    ? `${getCountryName(order.country, 'ru')} (${order.country})`
    : 'страна неизвестна';
  // The same words the order notification carries (server/order.js), so a
  // line in Telegram and a line here are recognisably the same order.
  const campaign = [
    order.adDetail && `Anuncio: ${order.adDetail}`,
    order.entry && `Entrada: ${order.entry}`,
  ].filter(Boolean);

  return (
    <article
      aria-label={`Заявка от ${order.name}`}
      className="grid gap-x-5 gap-y-3 border-b border-primary/10 py-4 lg:grid-cols-[176px_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.2fr)_44px] lg:items-start"
    >
      <div className="flex items-start gap-3 lg:block">
        <div className="w-44 shrink-0 lg:w-auto">
          <StatusSelect order={order} onChange={(status) => onUpdate({ status })} />
        </div>
        <p className="text-sm text-primary/75 lg:mt-2">
          {formatWhen(order.createdAt, now)}
          <Notified order={order} />
        </p>
      </div>

      <div className="min-w-0">
        <p className={`text-base ${isNew ? 'font-semibold' : 'font-medium'}`}>{order.name}</p>
        <p className="text-sm tabular-nums">{order.phone}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <a href={tel} className={isNew ? BTN_SOLID : BTN_GHOST}>
            <PhoneIcon />
            Позвонить
          </a>
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={BTN_GHOST}>
              WhatsApp
            </a>
          )}
        </div>
      </div>

      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-[55px] w-11 shrink-0 items-center justify-center overflow-hidden border border-primary/10 bg-surface">
          {cover ? (
            <img
              src={resolveImage(cover, 200)}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <span aria-hidden="true" className="font-serif text-sm font-light text-primary/40">
              M
            </span>
          )}
        </span>
        <div className="min-w-0">
          {product ? (
            <Link
              to={`/admin/catalog?product=${encodeURIComponent(product.id)}`}
              className="block font-medium hover:text-accent-text"
            >
              {order.productName || product.name}
            </Link>
          ) : (
            <p className="font-medium">{order.productName || 'Товар не указан'}</p>
          )}
          <p className="text-sm tabular-nums text-primary/75">
            {[order.productId, typeof order.price === 'number' && `${order.price} €`]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {order.comment && (
            <p className="mt-1 text-sm">
              <span className="text-primary/75">Комментарий: </span>
              {order.comment}
            </p>
          )}
        </div>
      </div>

      <div className="min-w-0 text-sm">
        <p>{[place, country].filter(Boolean).join(' · ')}</p>
        {order.attributionLabel && (
          <p className="mt-1 text-primary/75">Fuente: {order.attributionLabel}</p>
        )}
        {campaign.length > 0 && (
          <p className="break-words text-xs text-primary/75">{campaign.join(' · ')}</p>
        )}
        {/* Its own line: a device label has « · » inside it, and would run
            into the entry page above. */}
        {order.device && <p className="text-xs text-primary/75">Dispositivo: {order.device}</p>}
        <VisitButton visit={visit} panelId={visitPanelId} />
      </div>

      {/* On a phone the opened visit details come right under their button,
          ahead of the note and the menu; on a wide screen they take a row of
          their own under the order. */}
      <NoteField
        order={order}
        onSave={(note) => onUpdate({ note })}
        className="order-1 lg:order-none"
      />

      <div className="order-1 justify-self-end lg:order-none lg:justify-self-auto">
        <OverflowMenu title={`Действия с заявкой от ${order.name}`}>
          <MenuItem onClick={onRemove} disabled={deleting} danger>
            {deleting ? 'Удаляется…' : 'Удалить заявку'}
          </MenuItem>
        </OverflowMenu>
      </div>

      {visit.open && <VisitPanel visit={visit} id={visitPanelId} name={order.name} now={now} />}
    </article>
  );
}
