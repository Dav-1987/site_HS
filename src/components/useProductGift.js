import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useOptionalCatalog } from '../catalog/CatalogContext.jsx';
import { findProduct, isInStock, productGift } from '../data/catalog.js';

/**
 * The gift a product is currently offered with, resolved from the live catalog,
 * or null when there isn't one.
 *
 * Resolves the offer itself rather than taking it as a prop: every grid on the
 * site builds its tiles from a bare product, and threading the gift down
 * through each of them would be the same lookup written five times. The catalog
 * context is optional on purpose — a tile is rendered in a dozen places, and a
 * chip in its corner is not worth taking one of them down over.
 *
 * Sold out returns null for the same reason the corner badge drops the discount
 * for it: a gift with something unbuyable is noise.
 *
 * Its own file rather than a second export from Gift.jsx: a component file that
 * exports anything but components loses hot reload (see src/admin/gift.js for
 * the same split).
 */
export function useProductGift(product) {
  const { lang } = useLanguage();
  const allCategories = useOptionalCatalog()?.allCategories ?? [];
  const found = findProduct(allCategories, product?.id);
  if (!found || !isInStock(found.product)) return null;
  return productGift(allCategories, found.product, found.category, lang);
}
