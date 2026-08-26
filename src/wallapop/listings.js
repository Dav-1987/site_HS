import { productImages } from '../data/catalog.js';
import { isIncludedCategory, wallapopCategoryFor } from './categories.js';
import { isInStock } from '../data/catalog.js';

export const LISTING_STATUSES = ['not_published', 'published', 'sold'];

export const STATUS_LABELS = {
  not_published: 'Не опубликован',
  published: 'Опубликован',
  sold: 'Продан',
};

function compact(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function normalizeParagraphs(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const WALLAPOP_PERK_LINES = {
  bulbs: '🎁 Bombillas LED de regalo',
  led: '💡 Iluminación LED profesional',
  quality: '⭐ Calidad premium',
};

const MIRROR_INTROS = {
  default:
    'Este espejo de diseño elegante aporta luminosidad y una mayor sensación de amplitud a cualquier estancia. Su estilo versátil combina perfectamente con muebles modernos, minimalistas o clásicos.',
  quality:
    'Este espejo de diseño elegante aporta una mayor sensación de amplitud a cualquier estancia. Su estilo versátil combina perfectamente con muebles modernos, minimalistas o clásicos.',
};

const VANITY_INTROS = {
  default:
    'Este elegante tocador con espejo aporta luminosidad y una mayor sensación de amplitud a cualquier estancia. Su diseño versátil combina perfectamente con interiores modernos, minimalistas o clásicos.',
  quality:
    'Este elegante tocador con espejo aporta una mayor sensación de amplitud a cualquier estancia. Su diseño versátil combina perfectamente con interiores modernos, minimalistas o clásicos.',
};

const PROMOTION_FOOTER = [
  'Ideal para:',
  '✨ Salones de belleza',
  '✨ Maquillistas',
  '✨ Estudios de estética',
  '✨ Espacios beauty modernos',
  '',
  '🪞 Dale a tu espacio un look más profesional y elegante.',
  '',
  '📩 Escríbenos ahora y reserva el tuyo antes de que termine la promoción',
].join('\n');

const COMPACT_PROMOTION_FOOTER = [
  'Ideal para:',
  '✨ Salones de belleza',
  '✨ Maquillistas',
  '✨ Estudios de estética',
  '✨ Espacios beauty modernos',
  '',
  '🪞 Dale a tu espacio un look más profesional y elegante.',
  '📩 Entrega disponible. Escríbenos ahora y reserva el tuyo antes de que termine la promoción',
].join('\n');

export function strikethroughText(value) {
  return Array.from(String(value)).map((character) => `${character}\u0336`).join('');
}

export function listingPriceBlock(product) {
  const oldPrice = Number(product.oldPrice);
  const currentPrice = Number(product.price);
  const oldPriceText = Number.isFinite(oldPrice) ? oldPrice : compact(product.oldPrice);
  return [
    'Precio👇',
    `☑️ antes: ${strikethroughText(`${oldPriceText}€`)}`,
    `✅ ahora: ${Number.isFinite(currentPrice) ? currentPrice : compact(product.price)}€ 🔥🔥🔥`,
  ].join('\n');
}

function measurementFromDescription(description, labelPattern) {
  const match = String(description || '').match(
    new RegExp(`\\b(?:${labelPattern})\\s*:?\\s*(\\d+(?:[.,]\\d+)?)\\s*cm\\b`, 'i'),
  );
  return match?.[1] || '';
}

export function mirrorWallapopSize(product) {
  const description = product.description?.es || '';
  const height = measurementFromDescription(description, 'altura|alto');
  const width = measurementFromDescription(description, 'ancho');

  if (height && width) return `${width} × ${height} cm`;

  const measurements = compact(product.size || product.subtitle).match(/\d+(?:[.,]\d+)?/g) || [];
  if (measurements.length >= 2) {
    return `${measurements[0]} × ${measurements.at(-1)} cm`;
  }

  return compact(product.size || product.subtitle);
}

function buildMirrorWallapopDescription(product) {
  const size = mirrorWallapopSize(product);
  const perk = WALLAPOP_PERK_LINES[product.perks];
  const details = [
    '• Tipo: espejo de pie / de cuerpo entero',
    `• Medidas: ${size}`,
  ].join('\n');

  return [
    MIRROR_INTROS[product.perks] || MIRROR_INTROS.default,
    listingPriceBlock(product),
    details,
    perk,
    COMPACT_PROMOTION_FOOTER,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function shelfWallapopSize(product) {
  const description = product.description?.es || '';
  const width = measurementFromDescription(description, 'ancho');
  const depth = measurementFromDescription(description, 'prof\\.?|profundidad|fondo');
  const height = measurementFromDescription(description, 'altura|alto');

  if (width && depth && height) return `${width} × ${depth} × ${height} cm`;

  const measurements = compact(product.size || product.subtitle).match(/\d+(?:[.,]\d+)?/g) || [];
  if (measurements.length >= 3) {
    return `${measurements[0]} × ${measurements[1]} × ${measurements.at(-1)} cm`;
  }

  return compact(product.size || product.subtitle);
}

function buildShelfWallapopDescription(product) {
  const details = [
    '• Tipo: estantería de pie',
    `• Medidas: ${shelfWallapopSize(product)}`,
  ].join('\n');

  return [
    'Estantería práctica y decorativa, perfecta para organizar libros, plantas, fotografías, accesorios y objetos de decoración.',
    listingPriceBlock(product),
    details,
    '⭐ Calidad premium',
    COMPACT_PROMOTION_FOOTER,
  ].join('\n\n');
}

export function vanityWallapopSize(product) {
  const measurements = compact(product.size || product.subtitle).match(/\d+(?:[.,]\d+)?/g) || [];
  if (measurements.length >= 3) {
    return `${measurements[0]} × ${measurements[1]} × ${measurements[2]} cm`;
  }

  return compact(product.size || product.subtitle);
}

function pairedMeasurementFromDescription(description, labelPattern) {
  const match = String(description || '').match(
    new RegExp(
      `\\b(?:${labelPattern})\\s*:?\\s*(\\d+(?:[.,]\\d+)?)\\s*[x×]\\s*(\\d+(?:[.,]\\d+)?)\\s*cm\\b`,
      'i',
    ),
  );
  return match ? `${match[1]} × ${match[2]} cm` : '';
}

export function vanityMirrorWallapopSize(product) {
  // The field first: the mirror used to live in the description, and the
  // descriptions are being rewritten to sell the piece rather than list it.
  // Reading the prose is kept for a product typed the old way.
  const stored = String(product.mirrorSize ?? '').trim();
  if (stored) {
    const numbers = stored.match(/\d+(?:[.,]\d+)?/g) ?? [];
    if (/^\s*Ø/i.test(stored)) return numbers.length ? `Ø ${numbers[0]} cm` : '';
    if (numbers.length >= 2) return `${numbers[0]} × ${numbers.at(-1)} cm`;
  }
  return pairedMeasurementFromDescription(product.description?.es, 'espejo');
}

export function vanityShelvesWallapopSize(product) {
  const stored = String(product.shelvesSize ?? '').trim();
  if (stored) {
    const numbers = stored.match(/\d+(?:[.,]\d+)?/g) ?? [];
    if (numbers.length >= 2) return `${numbers[0]} × ${numbers.at(-1)} cm`;
  }
  return pairedMeasurementFromDescription(product.description?.es, 'estanter[ií]as?');
}

function buildVanityWallapopDescription(product) {
  const perk = WALLAPOP_PERK_LINES[product.perks];
  const shelvesSize = vanityShelvesWallapopSize(product);
  const details = [
    '• Tipo: tocador de maquillaje con espejo',
    `• Medidas: ${vanityWallapopSize(product)}`,
    `• Espejo: ${vanityMirrorWallapopSize(product)}`,
    shelvesSize ? `• Estanterías: ${shelvesSize}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return [
    VANITY_INTROS[product.perks] || VANITY_INTROS.default,
    listingPriceBlock(product),
    details,
    perk,
    COMPACT_PROMOTION_FOOTER,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function listingNoun(categorySlug) {
  if (categorySlug === 'espejos') return 'Espejo de cuerpo entero';
  if (categorySlug === 'tocadores-loft') return 'Tocador de maquillaje estilo loft';
  if (categorySlug === 'tocadores') return 'Tocador de maquillaje';
  if (categorySlug === 'estanterias') return 'Estantería';
  return 'Mueble';
}

export function buildWallapopTitle(product, category) {
  const noun = listingNoun(category.slug);
  const size = compact(product.size || product.subtitle);
  return [noun, size ? `· ${size}` : ''].filter(Boolean).join(' ');
}

export function buildWallapopDescription(product, category) {
  if (category.slug === 'espejos') {
    return buildMirrorWallapopDescription(product);
  }

  if (category.slug === 'estanterias') {
    return buildShelfWallapopDescription(product);
  }

  if (category.slug === 'tocadores' || category.slug === 'tocadores-loft') {
    return buildVanityWallapopDescription(product);
  }

  const noun = listingNoun(category.slug).toLowerCase();
  const reference = compact(product.reference || product.id);
  const material = compact(product.material?.es);
  const size = compact(product.size || product.subtitle);
  const sourceDescription = normalizeParagraphs(product.description?.es);
  const intro = `${noun.charAt(0).toUpperCase()}${noun.slice(1)}, modelo ${reference}.`;
  const facts = [
    material ? `Material: ${material}.` : '',
    !sourceDescription && size ? `Medidas: ${size}.` : '',
    `Referencia: ${reference}.`,
  ].filter(Boolean);
  return [intro, sourceDescription, listingPriceBlock(product), facts.join('\n'), PROMOTION_FOOTER]
    .filter(Boolean)
    .join('\n\n');
}

export function collectProductPhotos(product) {
  const candidates = [
    ...productImages(product),
    product.image,
    product.imageMobile,
    ...(Array.isArray(product.media)
      ? product.media.filter((item) => item?.type !== 'video').map((item) => item?.src)
      : []),
  ];
  return [...new Set(candidates.filter((src) => typeof src === 'string' && src.trim()))];
}

function sourceRecord(product, category) {
  const mapping = wallapopCategoryFor(category.slug);
  return {
    productId: product.id,
    reference: compact(product.reference),
    siteCategorySlug: category.slug,
    siteCategoryName: compact(category.name?.es),
    wallapopCategory: mapping.category,
    wallapopSection: mapping.section,
    wallapopType: mapping.type,
    titleEs: buildWallapopTitle(product, category),
    descriptionEs: buildWallapopDescription(product, category),
    price: Number(product.price) || 0,
    size: compact(product.size || product.subtitle),
    photos: collectProductPhotos(product),
    sourceUpdatedAt: compact(product.updatedAt),
  };
}

function sourceChanged(previous, next) {
  if (!previous) return true;
  return (
    [
      'reference',
      'siteCategorySlug',
      'siteCategoryName',
      'wallapopCategory',
      'wallapopSection',
      'wallapopType',
      'titleEs',
      'descriptionEs',
      'price',
      'size',
      'sourceUpdatedAt',
    ].some((key) => previous[key] !== next[key]) ||
    JSON.stringify(previous.photos ?? []) !== JSON.stringify(next.photos)
  );
}

export function buildPanelState(categories, savedState, now = new Date().toISOString()) {
  const previousProducts = savedState?.products ?? {};
  const products = {};

  for (const category of categories) {
    if (!isIncludedCategory(category.slug)) continue;
    for (const product of category.products ?? []) {
      // Nothing to list for a product that is out of stock: this panel exists
      // to prepare Wallapop ads, and an ad for something unbuyable is a wasted
      // listing. It returns the moment stock does — its saved status and notes
      // do not, exactly as for a product dropped from the catalog.
      if (!isInStock(product)) continue;
      const previous = previousProducts[product.id];
      const source = sourceRecord(product, category);
      products[product.id] = {
        ...source,
        status: LISTING_STATUSES.includes(previous?.status) ? previous.status : 'not_published',
        notes: typeof previous?.notes === 'string' ? previous.notes : '',
        importedAt: previous?.importedAt || now,
        updatedAt: sourceChanged(previous, source) ? now : previous.updatedAt || now,
      };
    }
  }

  return {
    version: 1,
    updatedAt: savedState?.updatedAt ?? null,
    products,
  };
}

export function panelRecords(state) {
  return Object.values(state?.products ?? {});
}
