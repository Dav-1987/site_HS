import { useCallback, useEffect, useRef, useState } from 'react';
import { loadDefaultCatalog } from '../data/catalog.js';
import { loadWallapopState, saveWallapopState } from './api.js';
import { buildPanelState } from './listings.js';

export function useWallapopPanel() {
  const [state, setState] = useState(null);
  const [loadingError, setLoadingError] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle');
  const stateRef = useRef(null);
  const queueRef = useRef(Promise.resolve());
  const saveSequence = useRef(0);

  const enqueueSave = useCallback((nextState) => {
    const sequence = ++saveSequence.current;
    setSaveStatus('saving');
    queueRef.current = queueRef.current
      .catch(() => {})
      .then(() => saveWallapopState(nextState))
      .then(() => {
        if (sequence === saveSequence.current) setSaveStatus('saved');
      })
      .catch(() => {
        if (sequence === saveSequence.current) setSaveStatus('error');
      });
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([loadDefaultCatalog(), loadWallapopState()])
      .then(([categories, savedState]) => {
        if (!active) return;
        const nextState = buildPanelState(categories, savedState);
        stateRef.current = nextState;
        setState(nextState);
        if (JSON.stringify(nextState.products) !== JSON.stringify(savedState.products ?? {})) {
          enqueueSave(nextState);
        } else {
          setSaveStatus('saved');
        }
      })
      .catch(() => {
        if (active) setLoadingError('Не удалось открыть локальные данные панели.');
      });
    return () => {
      active = false;
    };
  }, [enqueueSave]);

  const updateRecord = useCallback(
    (productId, patch) => {
      const current = stateRef.current;
      if (!current?.products?.[productId]) return;
      const nextState = {
        ...current,
        products: {
          ...current.products,
          [productId]: {
            ...current.products[productId],
            ...patch,
            updatedAt: new Date().toISOString(),
          },
        },
      };
      stateRef.current = nextState;
      setState(nextState);
      enqueueSave(nextState);
    },
    [enqueueSave],
  );

  return { state, loadingError, saveStatus, updateRecord };
}
