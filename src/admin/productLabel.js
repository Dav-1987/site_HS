// Label for a product in the admin's pickers ("Featured" cards, a product's
// "related" list). Shared so the two pickers can't drift apart.
//
// "Name · ARTÍCULO · Category" — many products share a generic name, so the
// reference (артикул) and the section are what make a row identifiable. A
// product that would not actually render is marked, since picking it (or
// hiding one already picked) otherwise looks like the card silently vanished.
export function productOptionLabel(p) {
  const base = [p.name, p.reference, p.categoryName].filter(Boolean).join(' · ');
  return p.hidden ? `${base} — скрыт` : base;
}
