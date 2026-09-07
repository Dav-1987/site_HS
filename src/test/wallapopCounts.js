import defaultCatalog from '../data/catalog.default.json';
import { WALLAPOP_CATEGORY_MAP } from '../wallapop/categories.js';

/**
 * How many products the Wallapop panel should show, counted from the catalog
 * snapshot instead of written down in the tests.
 *
 * That snapshot is refreshed from the live shop by `npm run data:pull` before
 * every deploy, so any total spelled out as a literal is a test that fails the
 * next time someone adds a product in /admin — which is exactly what happened
 * when two shelves arrived and every "56" became a 58. Worse, `deploy:seo` runs
 * the suite *before* the pull, so the break does not surface until the next
 * run, long after the deploy that caused it.
 *
 * The rule mirrors buildPanelState() in src/wallapop/listings.js: the approved
 * categories, minus anything out of stock. Deliberately spelled out again here
 * rather than imported from it — a count derived by the code under test would
 * agree with itself no matter what either of them did.
 */
const isApproved = (category) => Object.keys(WALLAPOP_CATEGORY_MAP).includes(category.slug);
const inStock = (product) => product.inStock !== false;

/** Every listable product across the approved categories. */
export const expectedPanelTotal = defaultCatalog
  .filter(isApproved)
  .reduce((n, category) => n + category.products.filter(inStock).length, 0);

/** The same, for one category — what the panel's category filter narrows to. */
export function expectedCategoryTotal(slug) {
  const category = defaultCatalog.find((c) => c.slug === slug);
  return category ? category.products.filter(inStock).length : 0;
}
