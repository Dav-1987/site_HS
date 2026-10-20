import { useEffect } from 'react';
import { useAdmin } from '../useAdmin.js';
import OrdersPanel from '../components/OrdersPanel.jsx';

/**
 * Заявки: the order list, fetched again on opening the section unless it was
 * fetched a moment ago (see useOrders.js).
 */
export default function OrdersSection() {
  const { orders } = useAdmin();
  const { refresh } = orders;
  useEffect(() => {
    refresh();
  }, [refresh]);
  return <OrdersPanel {...orders} />;
}
