import { useOutletContext } from 'react-router-dom';

/**
 * What the admin shell hands its sections: `editor` (catalog + settings state,
 * see useCatalogEditor.js), `orders` (see useOrders.js), `guides` (the
 * «Guías» articles, see useGuidesEditor.js) and `settingsField`.
 * One instance for the whole admin, so an edit made in one section is still
 * there — unsaved — after switching to another.
 */
export function useAdmin() {
  return useOutletContext();
}
