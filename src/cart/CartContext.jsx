import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { addItem, removeItem, sanitizeCart, setItemQty } from './cartUtils.js';

const CartContext = createContext(null);
const CART_KEY = 'hs_cart_v1';

function readStored() {
  try {
    return sanitizeCart(JSON.parse(localStorage.getItem(CART_KEY)));
  } catch {
    return [];
  }
}

/**
 * Cart state: an array of `{ id, qty }` lines persisted to localStorage.
 * Only ids and quantities are stored — product details are resolved from the
 * live catalog at render time (see cartUtils.cartLines).
 */
export function CartProvider({ children }) {
  const [items, setItems] = useState(readStored);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      add: (id, qty = 1) => setItems((prev) => addItem(prev, id, qty)),
      setQty: (id, qty) => setItems((prev) => setItemQty(prev, id, qty)),
      remove: (id) => setItems((prev) => removeItem(prev, id)),
      clear: () => setItems([]),
    }),
    [items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
