import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { findProduct } from '../../data/catalog.js';
import { useAdmin } from '../useAdmin.js';
import {
  DEFAULT_ORDER_VIEW,
  ORDER_VIEWS,
  WORK_GROUPS,
  ordersInView,
  viewCounts,
} from '../orderView.js';
import { BTN_GHOST } from '../ui.js';
import OrderRow from '../components/OrderRow.jsx';
import SearchBox from '../components/SearchBox.jsx';
import SectionPending from './SectionPending.jsx';

const TAB =
  'inline-flex min-h-10 items-center gap-2 border px-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

// What an empty tab says: the work tab empty is good news, not a blank.
const EMPTY = {
  work: 'Все заявки обработаны: новых и незавершённых нет.',
  new: 'Новых заявок нет — всем перезвонили.',
};

/**
 * Заявки: every order through the call-back workflow. The tab lives in the
 * address (`?view=`); the search in its own state, as in the catalog.
 */
export default function OrdersSection() {
  const { orders: ordersState, editor } = useAdmin();
  const { orders, error, deletingId, refresh, update, remove } = ordersState;
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!orders) return <SectionPending error={error} />;

  const requested = params.get('view');
  const view = ORDER_VIEWS.some((v) => v.key === requested) ? requested : DEFAULT_ORDER_VIEW;
  const counts = viewCounts(orders);
  const listed = ordersInView(orders, view, search);
  const now = new Date();
  const productOf = (order) =>
    order.productId ? findProduct(editor.categories ?? [], order.productId)?.product : null;

  const row = (order) => (
    <OrderRow
      key={order.id}
      order={order}
      product={productOf(order)}
      now={now}
      deleting={deletingId === order.id}
      onUpdate={(patch) => update(order, patch)}
      onRemove={() => remove(order)}
    />
  );

  // «В работе» goes by stage, the next thing to do first; a search or any
  // other tab is one list, newest first.
  const grouped = view === 'work' && !search.trim();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <SearchBox
          label="Поиск по заявкам"
          value={search}
          onChange={setSearch}
          placeholder="Имя, телефон, товар или артикул"
          className="flex-1 basis-72 lg:max-w-xl"
        />
        <p className="text-sm text-primary/75">
          Статус и заметка сохраняются сразу, без кнопки «Сохранить».
        </p>
      </div>

      <div role="group" aria-label="Статус заявок" className="flex flex-wrap gap-2">
        {ORDER_VIEWS.filter((v) => !v.optional || counts[v.key] > 0).map((v) => {
          const pressed = v.key === view;
          return (
            <button
              key={v.key}
              type="button"
              aria-pressed={pressed}
              onClick={() =>
                setParams(v.key === DEFAULT_ORDER_VIEW ? {} : { view: v.key }, { replace: true })
              }
              className={`${TAB} ${
                pressed
                  ? 'border-primary bg-primary font-semibold text-background'
                  : 'border-primary/30 hover:border-primary'
              }`}
            >
              {v.label}{' '}
              <span
                className={`tabular-nums ${pressed ? 'font-normal opacity-80' : 'text-secondary'}`}
              >
                {counts[v.key]}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="border border-danger px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {listed.length === 0 ? (
        <div className="py-10 text-sm">
          {search.trim() ? (
            <>
              <p className="text-primary/75">Ничего не нашлось.</p>
              <button type="button" onClick={() => setSearch('')} className={`${BTN_GHOST} mt-3`}>
                Сбросить поиск
              </button>
            </>
          ) : (
            <p className="text-primary/75">{EMPTY[view] ?? 'Здесь пока пусто.'}</p>
          )}
        </div>
      ) : grouped ? (
        WORK_GROUPS.map((group) => {
          const items = listed.filter((o) => o.status === group.status);
          if (!items.length) return null;
          return (
            <section key={group.status} aria-labelledby={`orders-${group.status}`}>
              <h2
                id={`orders-${group.status}`}
                className="flex items-baseline gap-2 border-b border-primary/20 pb-2 text-base font-semibold"
              >
                {group.title}{' '}
                <span className="font-normal tabular-nums text-secondary">{items.length}</span>
              </h2>
              {items.map(row)}
            </section>
          );
        })
      ) : (
        <div className="border-t border-primary/20">{listed.map(row)}</div>
      )}
    </div>
  );
}
