import { useLanguage } from '../i18n/LanguageContext.jsx';
import { productDiscount } from '../data/catalog.js';

/**
 * Product price. When a higher `oldPrice` is set, shows it struck through next
 * to the current price (in accent). Font size/family come from `className` on
 * the wrapper so it fits both the card and the product page.
 */
export default function Price({ product, className = '' }) {
  const { t } = useLanguage();
  const { onSale, oldPrice, price } = productDiscount(product);
  const cur = `${price} ${t('common.currency')}`;

  if (!onSale) {
    return <span className={className}>{cur}</span>;
  }

  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      <span className="text-[0.72em] text-primary/35 line-through">
        {oldPrice} {t('common.currency')}
      </span>
      <span className="text-[1.15em] font-medium text-accent">{cur}</span>
    </span>
  );
}
