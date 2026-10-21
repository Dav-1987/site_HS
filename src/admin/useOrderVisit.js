import { useCallback, useState } from 'react';
import { fetchOrderVisit } from './api.js';

/**
 * The «Подробности визита» of one order: asked from the server on the first
 * opening (it reads the access log then), kept while the row is on screen.
 */
export function useOrderVisit(orderId) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ status: 'idle' }); // idle | loading | done | failed

  const load = useCallback(() => {
    setState({ status: 'loading' });
    fetchOrderVisit(orderId)
      .then((result) => setState({ status: 'done', result }))
      .catch((e) => setState({ status: 'failed', error: e.message || 'ошибка сети' }));
  }, [orderId]);

  const toggle = useCallback(() => {
    setOpen((o) => !o);
    if (state.status === 'idle') load();
  }, [state.status, load]);

  return { open, state, toggle, retry: load };
}
