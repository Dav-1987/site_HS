import { NavLink } from 'react-router-dom';
import { ADMIN_SECTIONS, newOrdersLabel } from '../adminSections.js';
import AdminIcon from './AdminIcon.jsx';

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent';

// The count of orders nobody has called yet, on the «Заявки» link. Nothing at
// all while there are none, so the badge only ever means "go and call".
function NewOrdersBadge({ count }) {
  if (!count) return null;
  return (
    <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-primary tabular-nums">
      {newOrdersLabel(count)}
    </span>
  );
}

const SIDE_LINK = `flex min-h-11 items-center gap-3 px-3 text-sm transition-colors hover:bg-background ${FOCUS}`;

/** Desktop: the sections down the left edge, with the way out at the bottom. */
export function AdminSidebar({ newOrders, onLogout }) {
  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col gap-8 overflow-y-auto border-r border-primary/10 bg-surface px-3 py-7">
      <p className="px-3 font-serif text-2xl font-light leading-tight">Mirage Muebles</p>

      <nav aria-label="Разделы админки">
        <ul className="space-y-0.5">
          {ADMIN_SECTIONS.map((s) => (
            <li key={s.path}>
              <NavLink
                to={`/admin/${s.path}`}
                className={({ isActive }) =>
                  `${SIDE_LINK} ${isActive ? 'bg-background font-semibold' : ''}`
                }
              >
                <AdminIcon name={s.path} />
                <span className="flex-1">{s.title}</span>
                {/* The space keeps the name read as "Заявки 3 новые". */}
                {s.path === 'orders' && newOrders > 0 && ' '}
                {s.path === 'orders' && <NewOrdersBadge count={newOrders} />}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto space-y-0.5 border-t border-primary/10 pt-4">
        <a href="/" target="_blank" rel="noopener noreferrer" className={SIDE_LINK}>
          <AdminIcon name="external" className="h-4 w-4" />
          Открыть сайт
        </a>
        <a href="/utm" target="_blank" rel="noopener noreferrer" className={SIDE_LINK}>
          <AdminIcon name="link" className="h-4 w-4" />
          Ссылки UTM
        </a>
        <button type="button" onClick={onLogout} className={`${SIDE_LINK} w-full text-left`}>
          <AdminIcon name="logout" className="h-4 w-4" />
          Выйти
        </button>
      </div>
    </aside>
  );
}

/**
 * Tablet and phone: the same sections as a strip under the toolbar, scrolling
 * sideways when five don't fit. The way out lives in the toolbar's "⋯" menu.
 */
export function AdminNavStrip({ newOrders }) {
  return (
    <nav aria-label="Разделы админки" className="border-t border-primary/10">
      {/* Five equal columns, icon over label: all five fit a 320px phone,
          where a row of words had «Настройки» scrolled out of sight. */}
      <ul className="grid grid-cols-5">
        {ADMIN_SECTIONS.map((s) => (
          <li key={s.path}>
            <NavLink
              to={`/admin/${s.path}`}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-1 border-b-2 px-1 text-xs transition-colors ${FOCUS} ${
                  isActive
                    ? 'border-primary font-semibold text-primary'
                    : 'border-transparent text-primary/75 hover:text-primary'
                }`
              }
            >
              <span className="relative">
                <AdminIcon name={s.path} />
                {s.path === 'orders' && <NewOrdersDot count={newOrders} />}
              </span>
              {s.short}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// The strip's version of NewOrdersBadge: just the number, on the icon's corner,
// with the full "3 новые" for screen readers.
function NewOrdersDot({ count }) {
  if (!count) return null;
  return (
    <span className="absolute -right-3 -top-2 min-w-5 rounded-full bg-accent px-1 text-center text-[11px] font-semibold leading-5 text-primary tabular-nums">
      <span aria-hidden="true">{count}</span>
      <span className="sr-only">{newOrdersLabel(count)}</span>
    </span>
  );
}
