// Pure helpers for the public order endpoint: payload validation and message
// formatting. Side-effect free so they can be unit-tested without Express.

// Loosely validates a phone number: digits with optional leading + and
// spaces/dashes/parens as separators (however the customer chose to type it),
// with a plausible digit count. Catches typos/garbage ("abc", "12", a stray
// letter) without rejecting legitimate international numbers — nobody can be
// called back from a bad number, so this is worth a hard reject.
const PHONE_CHARS_RE = /^\+?[0-9\s\-().]+$/;
const EVENT_ID_RE = /^[A-Za-z0-9._:-]+$/;

export function isValidPhone(phone) {
  if (typeof phone !== 'string') return false;
  const trimmed = phone.trim();
  if (!trimmed || !PHONE_CHARS_RE.test(trimmed)) return false;
  const digits = (trimmed.match(/\d/g) || []).length;
  return digits >= 7 && digits <= 15;
}

/** Validate the customer payload; returns an error string or null. */
export function validateOrder(body) {
  if (!body || typeof body !== 'object') return 'invalid payload';
  if (typeof body.name !== 'string' || !body.name.trim()) return 'name is required';
  if (body.name.length > 200) return 'name is too long';
  if (typeof body.phone !== 'string' || !body.phone.trim()) return 'phone is required';
  if (body.phone.length > 50) return 'phone is too long';
  if (!isValidPhone(body.phone)) return 'phone is not a valid phone number';
  if (body.address !== undefined && typeof body.address !== 'string') return 'invalid address';
  if (body.address && body.address.length > 300) return 'address is too long';
  if (body.comment !== undefined && typeof body.comment !== 'string') return 'invalid comment';
  if (body.comment && body.comment.length > 2000) return 'comment is too long';
  if (typeof body.productId !== 'string' || !body.productId.trim()) return 'productId is required';
  if (body.productId.length > 100) return 'productId is too long';
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
    return {
      productId: product.id,
      productName: `${name}${subtitle ? ` ${subtitle}` : ''}`.trim(),
      price: Number.isFinite(product.price) && product.price >= 0 ? product.price : 0,
    };
  }
  return null;
}

/** Plain-text order summary shared by the Telegram and email notifications. */
export function formatOrderText({ name, phone, address, comment, productName, productId, price }) {
  const out = ['🛒 Nueva solicitud — Mirage Muebles', ''];
  out.push(`Producto: ${productName}${productId ? ` [${productId}]` : ''}`);
  if (typeof price === 'number' && Number.isFinite(price)) out.push(`Precio: ${price} €`);
  out.push('');
  out.push(`Cliente: ${name.trim()}`);
  out.push(`Teléfono: ${phone.trim()}`);
  if (address?.trim()) out.push(`Dirección: ${address.trim()}`);
  if (comment?.trim()) out.push(`Comentarios: ${comment.trim()}`);
  return out.join('\n');
}
