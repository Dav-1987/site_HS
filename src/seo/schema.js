// ============================================================
// Mirage Muebles — Schema.org (JSON-LD) builders
// Pure functions returning plain objects; rendered into the page
// via <JsonLd>. All URLs are absolute (rich results require it).
// ============================================================

import {
  isInStock,
  productImages,
  productDescription,
  productDiscount,
  productFullName,
  productLabel,
  resolveImage,
} from '../data/catalog.js';
import { withLang } from '../i18n/routing.js';

export const SITE = 'https://hsmuebles.es';
const ORG_NAME = 'Mirage Muebles';
const LOGO = `${SITE}/logo-mirage.png`;

/** Make any image/path absolute against the site origin. */
export function absUrl(path) {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE}${path.startsWith('/') ? '' : '/'}${path}`;
}

/** Drop undefined/empty keys so we never emit half-empty schema nodes. */
function clean(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0),
    ),
  );
}

/** Organization node. Socials/phone come from live settings.contact when set. */
export function organizationSchema(contact = {}) {
  const sameAs = [contact.instagram, contact.tiktok].filter(Boolean);
  const phone = (contact.phone || '').replace(/\s/g, '');
  const contactPoint = phone
    ? {
        '@type': 'ContactPoint',
        telephone: `+34${phone}`,
        contactType: 'customer service',
        areaServed: 'ES',
        availableLanguage: ['es', 'en'],
      }
    : undefined;

  return clean({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: ORG_NAME,
    url: SITE,
    logo: LOGO,
    ...(contact.email ? { email: contact.email } : {}),
    sameAs,
    contactPoint,
  });
}

/** WebSite node. */
export function websiteSchema(lang = 'es') {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: ORG_NAME,
    url: SITE,
    inLanguage: lang,
  };
}

/** BreadcrumbList from an ordered [{ name, url }] trail. */
export function breadcrumbSchema(trail) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: step.name,
      item: step.url,
    })),
  };
}

// The terms every order gets, as /envios and /devoluciones state them: Spain
// only, 35 € delivery within 3–5 days of the order being confirmed, and 14
// days from delivery to return it, the return shipping paid by us. Google
// Shopping and ChatGPT read them from the Offer; a page about them elsewhere
// is not tied to any product. Change them here and on those two pages together.
const SHIPPING_COUNTRY = 'ES';
const SHIPPING_PRICE = 35;
const DELIVERY_DAYS = { min: 3, max: 5 };
const RETURN_DAYS = 14;

const days = (min, max) => ({
  '@type': 'QuantitativeValue',
  minValue: min,
  maxValue: max,
  unitCode: 'DAY',
});

function shippingDetails() {
  return {
    '@type': 'OfferShippingDetails',
    shippingRate: { '@type': 'MonetaryAmount', value: SHIPPING_PRICE, currency: 'EUR' },
    shippingDestination: { '@type': 'DefinedRegion', addressCountry: SHIPPING_COUNTRY },
    // The 3–5 days count from confirmation, so none of it is handling time.
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: days(0, 0),
      transitTime: days(DELIVERY_DAYS.min, DELIVERY_DAYS.max),
    },
  };
}

function returnPolicy(lang) {
  return {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: SHIPPING_COUNTRY,
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: RETURN_DAYS,
    returnMethod: 'https://schema.org/ReturnByMail',
    returnFees: 'https://schema.org/FreeReturn',
    merchantReturnLink: `${SITE}${withLang('/devoluciones', lang)}`,
  };
}

/** Product + Offer node. */
export function productSchema(product, category, lang = 'es') {
  const { price } = productDiscount(product);
  // product.id, not product.reference. `reference` is the number shown to the
  // customer in the spec list and it is not unique: M-01…M-05 each belong to
  // both a dressing table and a manicure table, two different pieces. An sku or
  // mpn that points at two products identifies neither, and Google pairs brand
  // with mpn to tell our piece apart from anyone else's. `product.id` is unique
  // across all 124 items, and since we manufacture under our own brand our own
  // article number is genuinely the manufacturer part number.
  const sku = product.id;
  const url = `${SITE}${withLang(`/${category.slug}/${product.id}`, lang)}`;
  const images = productImages(product)
    .map((img) => absUrl(resolveImage(img, 1600)))
    .filter(Boolean);

  const offers =
    price > 0
      ? {
          '@type': 'Offer',
          price,
          priceCurrency: 'EUR',
          availability: isInStock(product)
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
          url,
          seller: { '@type': 'Organization', name: ORG_NAME },
          shippingDetails: shippingDetails(),
          hasMerchantReturnPolicy: returnPolicy(lang),
        }
      : undefined;

  return clean({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productLabel(product, lang),
    description: productDescription(product, category, lang),
    image: images,
    sku,
    mpn: sku,
    category: category.name[lang] ?? category.name.es,
    inLanguage: lang,
    brand: { '@type': 'Brand', name: ORG_NAME },
    offers,
  });
}

/** ItemList from products belonging to one category. */
export function productListSchema(products, categorySlug, lang = 'es') {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: productFullName(p, lang),
      url: `${SITE}${withLang(`/${categorySlug}/${p.id}`, lang)}`,
    })),
  };
}

/**
 * Article node for a «Guías» page. The author is the shop — the articles are
 * written for it, not by a named person. Dates are left out while unknown (an
 * article pulled from the seed file before it reached the database).
 */
export function articleSchema({ url, title, description, image, publishedAt, updatedAt, lang }) {
  return clean({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    image: image ? [absUrl(image)] : undefined,
    datePublished: publishedAt ?? undefined,
    dateModified: updatedAt ?? publishedAt ?? undefined,
    inLanguage: lang,
    url,
    mainEntityOfPage: url,
    author: { '@type': 'Organization', name: ORG_NAME, url: SITE },
    publisher: {
      '@type': 'Organization',
      name: ORG_NAME,
      logo: { '@type': 'ImageObject', url: LOGO },
    },
  });
}

/**
 * FAQPage from the questions an article answers. Only the ones its page shows
 * — Google ignores, and may penalise, questions that are in the markup alone.
 * Null when there are none.
 */
export function faqSchema(faq) {
  if (!faq?.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

/** ItemList of the guides on the section page. */
export function guideListSchema(guides, lang = 'es') {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: guides.length,
    itemListElement: guides.map((g, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: g[lang].title,
      url: `${SITE}${withLang(`/guias/${g.slug}`, lang)}`,
    })),
  };
}

/** ItemList from the top-level categories (catalog page). */
export function categoryListSchema(categories, lang = 'es') {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: categories.length,
    itemListElement: categories.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name[lang] ?? c.name.es,
      url: `${SITE}${withLang(`/${c.slug}`, lang)}`,
    })),
  };
}
