// ============================================================
// Mirage Muebles — Google Merchant Center product feed
// RSS 2.0 + the `g:` namespace. One feed, Spanish / Spain; it
// serves both Shopping and Meta's dynamic remarketing.
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
  resolveImage,
} from '../src/data/catalog.js';

const SITE = 'https://hsmuebles.es';
const BRAND = 'Mirage Muebles';
const CURRENCY = 'EUR';
const LANG = 'es';

// Google accepts one main image plus ten more.
const MAX_EXTRA_IMAGES = 10;
// Meta's Shop refuses to sell an item whose quantity is 0 or absent, and every
// item in the feed is made to order rather than picked off a shelf — there is no
// stock count to report and none is kept anywhere. A flat number stands in for
// "as many as you want", which is the documented way to say that; the honest
// part of the signal, whether the product can be had at all, stays with
// isInStock. Google ignores the field.
const MADE_TO_ORDER_QUANTITY = 100;
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
const PROMO_LINE =
  /\b(regalos?|gratis|gratuit[oa]s?|descuentos?|ofertas?|promoci[oó]n|rebajas?|sin coste)\b/i;

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
  return String(value ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

function tag(name, value) {
  return `      <${name}>${xml(value)}</${name}>`;
}

/** Absolute URL for a site-relative path; leaves an already-absolute one alone. */
function absUrl(path) {
  if (!path) return '';
  return /^https?:\/\//.test(path) ? path : `${SITE}${path}`;
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
      const images = productImages(product)
        .map((img) => absUrl(resolveImage(img, 1600)))
        .filter(Boolean);
      if (!images.length) continue;
      out.push({ product, category, images });
    }
  }
  return out;
}

function itemXml({ product, category, images }) {
  const { price, oldPrice, onSale } = productDiscount(product);
  const lines = [
    // product.id, not product.reference: five references are duplicated across
    // the catalog (M-01…M-05 appear twice) and Google needs this unique.
    tag('g:id', product.id),
    tag('g:title', productLabel(product).slice(0, MAX_TITLE)),
    tag(
      'g:description',
      cleanDescription(productDescription(product, category, LANG), productLabel(product)).slice(
        0,
        MAX_DESCRIPTION,
      ),
    ),
    tag('g:link', `${SITE}/${category.slug}/${product.id}`),
    tag('g:image_link', images[0]),
    ...images.slice(1, 1 + MAX_EXTRA_IMAGES).map((src) => tag('g:additional_image_link', src)),
    tag('g:availability', isInStock(product) ? 'in_stock' : 'out_of_stock'),
    tag('g:quantity_to_sell_on_facebook', isInStock(product) ? MADE_TO_ORDER_QUANTITY : 0),
    // A discounted product ships its pre-discount price as `price` and the
    // current one as `sale_price`, which is how Shopping draws the same
    // struck-through pair the product page shows.
    tag('g:price', money(onSale ? oldPrice : price)),
    ...(onSale ? [tag('g:sale_price', money(price))] : []),
    tag('g:brand', BRAND),
    tag('g:condition', 'new'),
    // Made to order under our own brand: there is no GTIN and no manufacturer
    // part number. `reference` is not offered as an mpn precisely because of
    // those duplicates.
    tag('g:identifier_exists', 'no'),
    // Our own taxonomy, which Google takes as a classification hint and which
    // Shopping campaigns can be split by. `g:google_product_category` is left
    // out on purpose — Google assigns it itself, and a wrong override is worse
    // than no override.
    tag('g:product_type', category.name?.[LANG] ?? category.slug),
  ];
  return `    <item>\n${lines.join('\n')}\n    </item>`;
}

/**
 * The whole feed as a string. Pure: hand it the catalog, get the XML — the
 * route decides when to call it and how long to hold the result.
 */
export function buildGoogleFeed(categories) {
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
