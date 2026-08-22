// ============================================================
// Mirage Muebles — Schema.org (JSON-LD) builders
// Pure functions returning plain objects; rendered into the page
// via <JsonLd>. All URLs are absolute (rich results require it).
// ============================================================

import {
  productImages,
  productDescription,
  productDiscount,
  productLabel,
  productReference,
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
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)),
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

/** Product + Offer node. */
export function productSchema(product, category, lang = 'es') {
  const { price } = productDiscount(product);
  const sku = product.reference?.trim() || productReference(product.name);
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
          availability: 'https://schema.org/InStock',
          itemCondition: 'https://schema.org/NewCondition',
          url,
          seller: { '@type': 'Organization', name: ORG_NAME },
        }
      : undefined;

  return clean({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productLabel(product),
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
      name: p.name,
      url: `${SITE}${withLang(`/${categorySlug}/${p.id}`, lang)}`,
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
