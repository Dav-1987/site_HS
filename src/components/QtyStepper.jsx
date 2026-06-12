import { useLanguage } from '../i18n/LanguageContext.jsx';
import { MAX_QTY } from '../cart/cartUtils.js';

const SIZES = {
  md: { btn: 'h-9 w-9 text-base', num: 'w-8 text-sm' },
  lg: { btn: 'h-11 w-11 text-lg', num: 'w-10 text-base' },
};

/**
 * Cart quantity stepper (− qty +). `onChange` receives the new quantity;
 * passing a value below 1 is the caller's "remove from cart" signal
 * (CartContext.setQty already removes the line in that case).
 * `name` scopes the +/− aria-labels to a product.
 */
export default function QtyStepper({ qty, onChange, name = '', size = 'md', className = '' }) {
  const { t } = useLanguage();
  const s = SIZES[size] ?? SIZES.md;
  const btnCls = `flex ${s.btn} items-center justify-center text-primary/60 transition-colors duration-300 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-primary/60`;
  const label = (key) => `${t(key)}${name ? `: ${name}` : ''}`;

  return (
    <div className={`flex items-center justify-center border border-primary/15 ${className}`}>
      <button
        type="button"
        onClick={() => onChange(qty - 1)}
        aria-label={label('cart.qty.decrease')}
        className={btnCls}
      >
        −
      </button>
      <span className={`${s.num} text-center text-primary`} aria-live="polite">
        {qty}
      </span>
      <button
        type="button"
        onClick={() => onChange(qty + 1)}
        disabled={qty >= MAX_QTY}
        aria-label={label('cart.qty.increase')}
        className={btnCls}
      >
        +
      </button>
    </div>
  );
}
