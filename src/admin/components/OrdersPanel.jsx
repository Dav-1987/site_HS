import { useEffect, useState } from 'react';
import { fetchOrders, deleteOrder as apiDeleteOrder } from '../api.js';
import { BTN_GHOST } from '../ui.js';

export default function OrdersPanel({ onClose }) {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchOrders()
      .then((d) => setOrders(d.orders))
      .catch((e) => setError(e.message || 'Не удалось загрузить заявки'));
  }, []);

  const fmt = (iso) =>
    new Date(iso).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' });

  const remove = async (o) => {
    if (!window.confirm(`Удалить заявку от ${o.name}? Это необратимо.`)) return;
    setDeletingId(o.id);
    setError('');
    try {
      await apiDeleteOrder(o.id);
      setOrders((prev) => prev.filter((x) => x.id !== o.id));
    } catch (e) {
      setError(e.message || 'Не удалось удалить заявку');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-primary/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-2xl overflow-y-auto bg-background p-6 shadow-floating"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-light text-primary">Заявки</h2>
          <button type="button" onClick={onClose} className={BTN_GHOST}>
            Закрыть
          </button>
        </div>

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
              {o.address && <p className="mt-1 text-sm text-primary/70">{o.address}</p>}
              {o.comment && <p className="mt-1 text-sm text-primary/60">{o.comment}</p>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
