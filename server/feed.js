// ============================================================
// Mirage Muebles — product feeds
// Three feeds over one Spanish / Spain product set: RSS XML for Google Shopping
// and Pinterest, plus CSV for Meta's catalog and dynamic ads. They share one
// normalized product record — see commonItemData — and serialize only the
// fields and media each platform understands.
// ============================================================
//
// Built from the same Postgres rows the site itself renders, on request, rather
// than written out to a file. Merchant Center checks every item against its
// landing page — a feed built from its own snapshot starts lying about price
// and availability the moment /admin saves, and repeated mismatches cost the
// account, not just the item.
//
// For the same reason every field below comes from src/data/catalog.js, the
// module the product page and its Product schema already use: title, price,
// discount, photos and availability cannot drift from what a crawler sees,
// because there is only one implementation of each.
//
// ⚠️ src/data/catalog.js must be deployed to the VPS alongside this file — see
// DEPLOY.md. Without it the API will not start.

import {
  isInStock,
  isListed,
  productDescription,
  productDiscount,
  productImages,
  productLabel,
  productMedia,
  resolveImage,
} from '../src/data/catalog.js';

const SITE = 'https://hsmuebles.es';
const BRAND = 'Mirage Muebles';
const CURRENCY = 'EUR';
const LANG = 'es';

// Google accepts one main image plus ten more.
const MAX_EXTRA_IMAGES = 10;
// Meta accepts up to twenty additional images and twenty product-level videos.
const MAX_META_EXTRA_IMAGES = 20;
const MAX_META_VIDEOS = 20;
// Merchant Center truncates past these; nothing in the catalog comes close
// (longest title 34 chars, longest description 119), but a future paste of a
// long description should be cut here rather than rejected on Google's side.
const MAX_TITLE = 150;
const MAX_DESCRIPTION = 5000;

// Merchant Center's content policy keeps `description` for describing the
// product: gifts, discounts, sales and calls to buy belong to a promotions feed,
// not here, and 51 of the catalog's descriptions end on a line offering free LED
// bulbs. That line is a real argument on the product page and stays there — it
// is dropped on the way into the feed instead, so the shop keeps its offer and
// Google gets a description of the furniture.
//
// Matched by meaning rather than by a list of ids, so a gift written into a new
// product tomorrow is handled without anyone remembering this rule exists.
//
// English words are matched too, even though the feed only ever reads the `es`
// description. The catalog keeps both languages in one record and nothing stops
// the English text from being pasted into the Spanish field — it happened to
// Tocador-T-02, whose English gift line reached Merchant Center past a
// Spanish-only filter. The gift emoji is matched on its own for the same
// reason: it outlives any particular wording, in any language.
//
// English "sale" is deliberately absent: in a Spanish description it is far
// more likely to be salir — "el cajón sale suavemente" — and cutting a real
// sentence costs more than letting one English word through.
const PROMO_LINE =
  /🎁|\b(regalos?|gratis|gratuit[oa]s?|descuentos?|ofertas?|promoci[oó]n|rebajas?|sin coste|free|gift|bonus|discounts?|offer)\b/i;

/**
 * The description minus its promotional lines. Only whole lines go: the offer
 * always sits on its own line, and dropping a clause mid-sentence would leave
 * worse text than it removed. Falls back to the product's title if a
 * description turns out to be nothing but promotion — Google rejects an empty
 * one, and no catalog entry is currently in that state.
 */
function cleanDescription(text, fallback) {
  const kept = String(text ?? '')
    .split('\n')
    .filter((line) => !PROMO_LINE.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return kept || fallback;
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };

/**
 * XML-escape a value. Also drops the control characters XML 1.0 forbids
 * outright (tab/newline/carriage return excepted) — they cannot be escaped,
 * only removed, and one of them anywhere makes the whole feed unparseable.
 */
function xml(value) {
  return (
    String(value ?? '')
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/[&<>"']/g, (c) => ESCAPES[c])
  );
}

function tag(name, value) {
  return `      <${name}>${xml(value)}</${name}>`;
}

/** Absolute URL for a site-relative path; leaves an already-absolute one alone. */
function absUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Google wants a decimal amount and a currency code: "639.00 EUR". */
function money(amount) {
  return `${Number(amount).toFixed(2)} ${CURRENCY}`;
}

/**
 * The products that belong in the feed, each paired with its category.
 *
 * Selection is derived from the product's state on the site rather than from a
 * switch of its own, which is what makes it impossible to advertise something
 * the site does not show:
 *  - a category or product that is not public is out. `off` pages 404 and
 *    `unlisted` ones are linked from nowhere — paying for a click on either is
 *    at best wasted and at worst an item disapproval for a broken landing page.
 *  - no price or no photo is out: Google rejects such items anyway.
 *
 * Out of stock is deliberately NOT a reason to drop an item — it ships with
 * `availability: out_of_stock` instead, so the item keeps its identity and
 * history in Merchant Center and starts serving again the moment stock returns.
 */
export function feedProducts(categories) {
  const out = [];
  for (const category of categories ?? []) {
    if (!isListed(category)) continue;
    for (const product of category.products ?? []) {
      if (!isListed(product)) continue;
      const { price } = productDiscount(product);
      if (price <= 0) continue;
      const sourceImages = productImages(product);
      const images = sourceImages.map((img) => absUrl(resolveImage(img, 1600))).filter(Boolean);
      if (!images.length) continue;
      // Meta documents JPEG/PNG for catalog images. The original uploads are
      // JPG, while resolveImage intentionally turns the site and Google URLs
      // into WebP; keep a Meta-only list so neither platform compromises the
      // other's media format.
      const metaImages = sourceImages
        .map((img) =>
          img.startsWith('/') || /^https?:\/\//.test(img)
            ? absUrl(img)
            : absUrl(resolveImage(img, 1600)),
        )
        .filter(Boolean);
      const videos = productMedia(product)
        .filter((media) => media.type === 'video')
        .map((media) => absUrl(media.src))
        .filter(Boolean);
      out.push({ product, category, images, metaImages, videos });
    }
  }
  return out;
}

// Pinterest and Meta both use Google's Product Category taxonomy as a strong
// classification hint. Pinterest limits how widely an uncategorised item is
// shown; Meta uses it to understand and deliver the product more accurately.
//
// The catalog has no field to read it from: `category` is the site's own menu,
// where 68 of 124 products sit in a single "Otros Modelos" bucket holding
// mirrors, dressers, consoles and manicure tables together. The product title,
// however, always opens with the Spanish noun for the piece — six nouns cover
// the whole catalog — so the category is derived from that rather than from a
// hand-kept list of ids that a new product would silently fall out of.
//
// Two of these are deliberately coarser than the taxonomy allows:
//  - Tocadores has children for bathroom and bedroom vanities; "Tocador
//    100 × 40 × 160 cm" does not say which, and a parent is never wrong.
//  - Manicure tables have no category of their own (the nearest, Peluquería y
//    cosmética, covers chairs only), so they ship as plain Mesas.
//
// Estanterías is the one place where the sibling categories are easy to
// confuse: 6372 "Estantes y estanterías" is a shelf you hang on a wall, 465
// "Librerías y estanterías" is a unit that stands on the floor. Every shelving
// piece in the catalog is 150–200 cm tall and 35–40 cm deep, so it is the
// second — under 6372 Pinterest would show a two-metre unit to someone looking
// for a board to put above a desk.
const GOOGLE_PRODUCT_CATEGORIES = [
  [/^tocador/, '4148'], // Mobiliario > Armarios y almacenamiento > Tocadores
  [/^espejo/, '595'], // Casa y jardín > Decoración > Espejos
  [/^estanteria/, '465'], // Mobiliario > Estanterías > Librerías y estanterías
  [/^consola/, '1602'], // Mobiliario > Mesas > Mesas decorativas > Consolas para sofás
  [/^comoda/, '4195'], // Mobiliario > Armarios y almacenamiento > Aparadores del dormitorio
  [/^mesa/, '6392'], // Mobiliario > Mesas
];

/**
 * The Google Product Category id for a product, or '' if its title opens with a
 * word we do not recognise. Accents are stripped before matching so that
 * "Estantería" and "Estanteria", "Cómoda" and "Comoda" are the same word.
 */
function googleProductCategory(product) {
  const first = String(productLabel(product) ?? '')
    .trim()
    .split(/\s+/)[0]
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return GOOGLE_PRODUCT_CATEGORIES.find(([re]) => re.test(first))?.[1] ?? '';
}

/**
 * The product facts every platform must agree on. Serializers below only change
 * syntax and platform-specific spelling (in_stock in Google XML, in stock in
 * Meta CSV); identity, price, copy and URLs always come from this record.
 */
function commonItemData({ product, category, images }) {
  const { price, oldPrice, onSale } = productDiscount(product);
  const title = productLabel(product).slice(0, MAX_TITLE);
  return {
    id: product.id,
    title,
    description: cleanDescription(
      productDescription(product, category, LANG),
      productLabel(product),
    ).slice(0, MAX_DESCRIPTION),
    link: `${SITE}/${category.slug}/${product.id}`,
    images,
    inStock: isInStock(product),
    price: onSale ? oldPrice : price,
    salePrice: onSale ? price : null,
    brand: BRAND,
    condition: 'new',
    mpn: product.id,
    productType: category.name?.[LANG] ?? category.slug,
  };
}

function commonItemLines(entry) {
  const item = commonItemData(entry);
  return [
    // product.id, not product.reference: five references are duplicated across
    // the catalog (M-01…M-05 appear twice) and Google needs this unique.
    tag('g:id', item.id),
    tag('g:title', item.title),
    tag('g:description', item.description),
    tag('g:link', item.link),
    tag('g:image_link', item.images[0]),
    ...item.images.slice(1, 1 + MAX_EXTRA_IMAGES).map((src) => tag('g:additional_image_link', src)),
    tag('g:availability', item.inStock ? 'in_stock' : 'out_of_stock'),
    // A discounted product ships its pre-discount price as `price` and the
    // current one as `sale_price`, which is how Shopping draws the same
    // struck-through pair the product page shows.
    tag('g:price', money(item.price)),
    ...(item.salePrice !== null ? [tag('g:sale_price', money(item.salePrice))] : []),
    tag('g:brand', item.brand),
    tag('g:condition', item.condition),
    // Made to order under our own brand, so there is no GTIN — but there is a
    // manufacturer part number, because we are the manufacturer. It is
    // product.id rather than product.reference: the latter is what the spec
    // list shows the customer and is not unique, with M-01…M-05 each shared by
    // a dressing table and a manicure table. The same value is published as
    // sku/mpn in the page's Product schema, so the feed and the landing page
    // Google compares it against agree.
    tag('g:mpn', item.mpn),
    // Our own taxonomy, which both platforms take as a classification hint and
    // which Shopping campaigns can be split by.
    tag('g:product_type', item.productType),
  ];
}

function wrapItem(lines) {
  return `    <item>\n${lines.join('\n')}\n    </item>`;
}

function googleItemXml(entry) {
  return wrapItem([
    ...commonItemLines(entry),
    // `g:google_product_category` is deliberately absent here. Google assigns a
    // category itself and documents the override as being for three cases only
    // — a category whose extra attributes we are missing, a Shopping campaign
    // that needs regrouping, and alcohol. None of them is ours, and a wrong
    // override risks disapproval. Pinterest is the platform that wants the
    // field, and it gets its own feed below rather than pushing an override
    // into Google's.
  ]);
}

function pinterestItemXml(entry) {
  const gpc = googleProductCategory(entry.product);
  return wrapItem([
    ...commonItemLines(entry),
    // Pinterest accepts one hosted product video through `video_link`. Keep
    // the first video in the catalog's own media order as the primary one;
    // image_link remains the required fallback for product Pins and listings.
    ...(entry.videos[0] ? [tag('g:video_link', entry.videos[0])] : []),
    // Pinterest reads this to place a product in its browsable sections; without
    // it the item still loads but its reach is limited, which is the whole
    // reason for being on Pinterest. Omitted rather than guessed when the title
    // says nothing recognisable — no category beats a wrong one.
    ...(gpc ? [tag('g:google_product_category', gpc)] : []),
  ]);
}

const META_VIDEO_HEADERS = Array.from(
  { length: MAX_META_VIDEOS },
  (_, index) => `video[${index}].url`,
);
const META_HEADERS = [
  'id',
  'title',
  'description',
  'availability',
  'condition',
  'price',
  'link',
  'image_link',
  'brand',
  'additional_image_link',
  'sale_price',
  'mpn',
  'google_product_category',
  'product_type',
  'material',
  'size',
  'internal_label',
  ...META_VIDEO_HEADERS,
];

/** RFC 4180-compatible cell escaping, including embedded quotes and newlines. */
function csvCell(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvRow(values) {
  return values.map(csvCell).join(',');
}

function localizedValue(value) {
  if (value && typeof value === 'object') return value[LANG] ?? value.en ?? '';
  return value ?? '';
}

function metaInternalLabels(entry, item) {
  const labels = [`category:${entry.category.slug}`];
  if (entry.videos.length) labels.push('has_video');
  if (item.salePrice !== null) labels.push('on_sale');
  return `[${labels.map((label) => `'${label}'`).join(',')}]`;
}

function metaItemCsv(entry) {
  const item = commonItemData(entry);
  const videos = entry.videos.slice(0, MAX_META_VIDEOS);
  const values = {
    id: item.id,
    title: item.title,
    description: item.description,
    availability: item.inStock ? 'in stock' : 'out of stock',
    condition: item.condition,
    price: money(item.price),
    link: item.link,
    image_link: entry.metaImages[0],
    brand: item.brand,
    additional_image_link: entry.metaImages.slice(1, 1 + MAX_META_EXTRA_IMAGES).join(','),
    sale_price: item.salePrice === null ? '' : money(item.salePrice),
    mpn: item.mpn,
    google_product_category: googleProductCategory(entry.product),
    product_type: item.productType,
    material: localizedValue(entry.product.material),
    size: localizedValue(entry.product.size),
    internal_label: metaInternalLabels(entry, item),
    ...Object.fromEntries(META_VIDEO_HEADERS.map((header, index) => [header, videos[index] ?? ''])),
  };
  return csvRow(META_HEADERS.map((header) => values[header]));
}

/**
 * A whole feed as a string. Pure: hand it the catalog, get the XML — the route
 * decides when to call it and how long to hold the result.
 */
function buildFeed(categories, itemXml) {
  const items = feedProducts(categories).map(itemXml).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${xml(BRAND)}</title>
    <link>${SITE}</link>
    <description>Muebles minimalistas — ${xml(BRAND)}</description>
${items}
  </channel>
</rss>
`;
}

/** The feed Google Merchant Center fetches. */
export function buildGoogleFeed(categories) {
  return buildFeed(categories, googleItemXml);
}

/** The enriched CSV feed Meta Commerce Manager fetches. */
export function buildMetaFeed(categories) {
  const items = feedProducts(categories).map(metaItemCsv);
  return `${[META_HEADERS.join(','), ...items].join('\r\n')}\r\n`;
}

/** The same products, categorised for Pinterest. */
export function buildPinterestFeed(categories) {
  return buildFeed(categories, pinterestItemXml);
}
