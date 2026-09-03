// Pure helpers for the public order endpoint: payload validation and message
// formatting. Side-effect free so they can be unit-tested without Express.

import { describeAttribution } from './attribution.js';
import { productGift } from '../src/data/catalog.js';
import {
  getCountryName,
  isShippingCountry,
  isValidPhone as isValidInternationalPhone,
  isValidPostalCode as isValidInternationalPostalCode,
  normalizeIsoCountryCode,
} from './order-data.js';

/** Канонический хост сайта — тот же, что в server/feed.js. */
const SITE = 'https://hsmuebles.es';

const EVENT_ID_RE = /^[A-Za-z0-9._:-]+$/;

export function isValidPhone(phone, country) {
  return isValidInternationalPhone(phone, country);
}

export function isValidPostalCode(postalCode) {
  return isValidInternationalPostalCode(postalCode);
}

/** Validate the customer payload; returns an error string or null. */
export function validateOrder(body) {
  if (!body || typeof body !== 'object') return 'invalid payload';
  if (typeof body.name !== 'string' || !body.name.trim()) return 'name is required';
  if (body.name.length > 200) return 'name is too long';
  if (typeof body.country !== 'string' || !body.country.trim()) return 'country is required';
  if (!normalizeIsoCountryCode(body.country)) return 'country must be an ISO 3166-1 alpha-2 code';
  if (!isShippingCountry(body.country)) return 'country is not available for delivery';
  if (typeof body.phone !== 'string' || !body.phone.trim()) return 'phone is required';
  if (body.phone.length > 50) return 'phone is too long';
  if (!isValidPhone(body.phone, body.country)) return 'phone is not a valid phone number';
  if (typeof body.postalCode !== 'string' || !body.postalCode.trim())
    return 'postalCode is required';
  if (body.postalCode.length > 20) return 'postalCode is too long';
  if (!isValidPostalCode(body.postalCode)) return 'postalCode is not a valid postal code';
  if (body.address !== undefined && typeof body.address !== 'string') return 'invalid address';
  if (body.address && body.address.length > 300) return 'address is too long';
  if (body.comment !== undefined && typeof body.comment !== 'string') return 'invalid comment';
  if (body.comment && body.comment.length > 2000) return 'comment is too long';
  if (typeof body.productId !== 'string' || !body.productId.trim()) return 'productId is required';
  if (body.productId.length > 100) return 'productId is too long';
  // Attribution is best-effort telemetry: a missing or malformed snapshot must
  // never cost the customer their order, so it is sanitized, not rejected.
  if (
    body.attribution !== undefined &&
    body.attribution !== null &&
    (typeof body.attribution !== 'object' || Array.isArray(body.attribution))
  )
    return 'invalid attribution';
  if (typeof body.eventId !== 'string' || !body.eventId.trim()) return 'eventId is required';
  if (body.eventId.length > 128 || !EVENT_ID_RE.test(body.eventId)) return 'invalid eventId';
  return null;
}

/**
 * Resolve the product fields the server is willing to trust for an order.
 * Client-supplied names and prices are deliberately ignored: the live catalog
 * is the source of truth for both the label shown to staff and the current
 * payable price.
 */
export function resolveOrderProduct(categories, productId) {
  for (const category of categories ?? []) {
    const product = category?.products?.find((item) => item.id === productId);
    if (!product) continue;
    const subtitle = typeof product.subtitle === 'string' ? product.subtitle.trim() : '';
    const name = typeof product.name === 'string' ? product.name.trim() : '';
    // Канонический адрес товара — тот же, что строит товарный фид и что отдаёт
    // роутер: /<slug категории>/<id>. Собираем здесь, а не на клиенте: каталог
    // всё равно уже прочитан, а заявка от подделанного тела запроса не должна
    // приносить произвольную ссылку в телеграм владельцу.
    const slug = typeof category.slug === 'string' ? category.slug.trim() : '';
    // Подарок тоже резолвим здесь, а не берём из тела запроса: то, что поедет
    // вместе со столом, решает каталог, а не клиент. Испанский — на нём
    // написано всё уведомление.
    const gift = productGift(categories, product, category, 'es');
    return {
      productId: product.id,
      productName: `${name}${subtitle ? ` ${subtitle}` : ''}`.trim(),
      productUrl: slug ? `${SITE}/${slug}/${product.id}` : '',
      price: Number.isFinite(product.price) && product.price >= 0 ? product.price : 0,
      giftName: gift?.name ?? '',
    };
  }
  return null;
}

/** Plain-text order summary shared by the Telegram and email notifications. */
export function formatOrderText({
  name,
  phone,
  country,
  postalCode,
  address,
  comment,
  productName,
  productId,
  productUrl,
  price,
  giftName,
  attribution,
}) {
  const out = ['🛒 Nueva solicitud — Mirage Muebles', ''];
  out.push(`Producto: ${productName}${productId ? ` [${productId}]` : ''}`);
  if (productUrl) out.push(productUrl);
  if (typeof price === 'number' && Number.isFinite(price)) out.push(`Precio: ${price} €`);
  // Без этой строки подарок просто не уедет: заявка выглядит как обычный заказ
  // одного товара.
  if (giftName) out.push(`🎁 Regalo: ${giftName}`);
  out.push('');
  out.push(`Cliente: ${name.trim()}`);
  out.push(`Teléfono: ${phone.trim()}`);
  if (country) out.push(`País: ${getCountryName(country, 'es')} (${country})`);
  if (postalCode?.trim()) out.push(`Código Postal: ${postalCode.trim()}`);
  if (address?.trim()) out.push(`Dirección: ${address.trim()}`);
  if (comment?.trim()) out.push(`Comentarios: ${comment.trim()}`);
  out.push('');
  out.push(`Fuente: ${describeAttribution(attribution)}`);
  return out.join('\n');
}
