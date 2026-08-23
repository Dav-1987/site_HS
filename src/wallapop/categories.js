export const INCLUDED_CATEGORY_SLUGS = [
  'espejos',
  'tocadores',
  'tocadores-loft',
  'estanterias',
];

const COMMON_CATEGORY = 'Hogar y jardín';
const COMMON_SECTION = 'Muebles, decoración y jardín';

export const WALLAPOP_CATEGORY_MAP = {
  espejos: {
    category: COMMON_CATEGORY,
    section: COMMON_SECTION,
    type: 'Espejos',
  },
  tocadores: {
    category: COMMON_CATEGORY,
    section: COMMON_SECTION,
    type: 'Tocadores',
  },
  'tocadores-loft': {
    category: COMMON_CATEGORY,
    section: COMMON_SECTION,
    type: 'Tocadores estilo loft',
  },
  estanterias: {
    category: COMMON_CATEGORY,
    section: COMMON_SECTION,
    type: 'Estanterías y librerías',
  },
};

export function wallapopCategoryFor(siteCategorySlug) {
  return WALLAPOP_CATEGORY_MAP[siteCategorySlug] ?? null;
}

export function isIncludedCategory(siteCategorySlug) {
  return INCLUDED_CATEGORY_SLUGS.includes(siteCategorySlug);
}
