import { getCountryName } from '../../../server/order-data.js';

/**
 * The order list of the «Заявки» section. The orders themselves — loading,
 * deleting — come from useOrders(), which the admin shell owns.
 */
export default function OrdersPanel({ orders, error, deletingId, remove }) {
  const fmt = (iso) =>
    new Date(iso).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="max-w-2xl">
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {!orders && !error && <p className="text-primary/50">Загрузка…</p>}
      {orders && orders.length === 0 && <p className="text-primary/50">Пока нет заявок.</p>}

      <ul className="space-y-3">
        {orders?.map((o) => (
          <li key={o.id} className="border border-primary/10 bg-surface px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-primary">{o.name}</p>
                <p className="text-xs text-primary/45">{fmt(o.createdAt)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="flex gap-1.5 text-[10px] uppercase tracking-[0.1em]">
                  <span className={o.telegramSent ? 'text-accent-text' : 'text-primary/30'}>
                    Telegram {o.telegramSent ? '✓' : '✗'}
                  </span>
                  <span className={o.emailSent ? 'text-accent-text' : 'text-primary/30'}>
                    Email {o.emailSent ? '✓' : '✗'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => remove(o)}
                  disabled={deletingId === o.id}
                  aria-label={`Удалить заявку от ${o.name}`}
                  className="text-primary/30 transition-colors hover:text-red-600 disabled:opacity-40"
                >
                  {deletingId === o.id ? '…' : '✕'}
                </button>
              </div>
            </div>
            <p className="mt-2 text-sm text-primary/80">
              <a href={`tel:${o.phone}`} className="hover:text-accent-text">
                {o.phone}
              </a>
            </p>
            {o.productName && (
              <p className="mt-1 text-sm text-primary/70">
                {o.productName}
                {o.productId && <span className="text-primary/40"> [{o.productId}]</span>}
              </p>
            )}
            {typeof o.price === 'number' && (
              <p className="mt-1 text-sm text-accent-text">{o.price} €</p>
            )}
            <p className="mt-1 text-sm text-primary/70">
              Страна:{' '}
              {o.country ? `${getCountryName(o.country, 'ru')} (${o.country})` : 'неизвестна'}
            </p>
            {(o.postalCode || o.address) && (
              <p className="mt-1 text-sm text-primary/70">
                {[o.postalCode, o.address].filter(Boolean).join(', ')}
              </p>
            )}
            {o.comment && <p className="mt-1 text-sm text-primary/60">{o.comment}</p>}
            {o.attributionLabel && (
              <p className="mt-2 text-xs uppercase tracking-[0.1em] text-primary/45">
                Fuente: {o.attributionLabel}
              </p>
            )}
            {/* Объявление и точка входа — как есть, без uppercase: это имена
                  из рекламного кабинета и путь страницы, их регистр значащий. */}
            {(o.adDetail || o.entry) && (
              <p className="mt-0.5 break-words text-xs text-primary/40">
                {[o.adDetail && `Anuncio: ${o.adDetail}`, o.entry && `Entrada: ${o.entry}`]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
            {/* Отдельной строкой: подпись устройства сама разделена « · »,
                  и в строке выше она слиплась бы со страницей входа. */}
            {o.device && <p className="mt-0.5 text-xs text-primary/40">Dispositivo: {o.device}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
