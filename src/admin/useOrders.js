import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchOrders, deleteOrder as apiDeleteOrder } from './api.js';

// How recent a request may be for opening «Заявки» to skip a new one. The shell
// asks once for the sidebar's count of new orders, and landing straight on the
// section must not ask twice; coming back to it later does refresh the list.
const FRESH_MS = 15_000;

/**
 * The order list, owned by the admin shell so the sidebar's count of new orders
 * and the «Заявки» section read the same data.
 */
export function useOrders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const lastRequest = useRef(0);

  const refresh = useCallback(() => {
    if (Date.now() - lastRequest.current < FRESH_MS) return;
    lastRequest.current = Date.now();
    fetchOrders()
      .then((d) => {
        setOrders(d.orders);
        setError('');
      })
      .catch((e) => setError(e.message || 'Не удалось загрузить заявки'));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const remove = useCallback(async (order) => {
    if (!window.confirm(`Удалить заявку от ${order.name}? Это необратимо.`)) return;
    setDeletingId(order.id);
    setError('');
    try {
      await apiDeleteOrder(order.id);
      setOrders((prev) => prev.filter((x) => x.id !== order.id));
    } catch (e) {
      setError(e.message || 'Не удалось удалить заявку');
    } finally {
      setDeletingId(null);
    }
  }, []);

  // Orders saved before statuses existed have none and are not counted.
  const newCount = (orders ?? []).filter((o) => o.status === 'new').length;

  return { orders, error, deletingId, newCount, refresh, remove };
}
