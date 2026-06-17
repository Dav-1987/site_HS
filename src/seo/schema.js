// ============================================================
// HS Muebles — Schema.org (JSON-LD) builders
// Pure functions returning plain objects; rendered into the page
// via <JsonLd>. All URLs are absolute (rich results require it).
// ============================================================

import {
  productImages,
  productDescription,
  productDiscount,
  productReference,
  resolveImage,
} from '../data/catalog.js';

export const SITE = 'https://hsmuebles.es';
const ORG_NAME = 'HS Muebles';
const LOGO = `${SITE}/logo-hs.png`;

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
export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: ORG_NAME,
    url: SITE,
    inLanguage: 'es',
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
export function productSchema(product, category) {
  const { price } = productDiscount(product);
  const sku = product.reference?.trim() || productReference(product.name);
  const url = `${SITE}/${category.slug}/${product.id}`;
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
    name: product.name,
    description: productDescription(product, category, 'es'),
    image: images,
    sku,
    mpn: sku,
    category: category.name.es,
    brand: { '@type': 'Brand', name: ORG_NAME },
    offers,
  });
}

/** ItemList from products belonging to one category. */
export function productListSchema(products, categorySlug) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.name,
      url: `${SITE}/${categorySlug}/${p.id}`,
    })),
  };
}

/** ItemList from the top-level categories (catalog page). */
export function categoryListSchema(categories) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: categories.length,
    itemListElement: categories.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name.es,
      url: `${SITE}/${c.slug}`,
    })),
  };
}
