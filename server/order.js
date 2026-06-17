// Pure helpers for the public order endpoint: payload validation and message
// formatting. Side-effect free so they can be unit-tested without Express.

/** Validate the customer payload; returns an error string or null. */
export function validateOrder(body) {
  if (!body || typeof body !== 'object') return 'invalid payload';
  if (typeof body.name !== 'string' || !body.name.trim()) return 'name is required';
  if (body.name.length > 200) return 'name is too long';
  if (typeof body.phone !== 'string' || !body.phone.trim()) return 'phone is required';
  if (body.phone.length > 50) return 'phone is too long';
  if (body.comment !== undefined && typeof body.comment !== 'string') return 'invalid comment';
  if (body.comment && body.comment.length > 2000) return 'comment is too long';
  if (typeof body.productName !== 'string' || !body.productName.trim()) return 'productName is required';
  return null;
}

/** Plain-text order summary shared by the Telegram and email notifications. */
export function formatOrderText({ name, phone, comment, productName, productId }) {
  const out = ['🛒 Nueva solicitud — HS Muebles', ''];
  out.push(`Producto: ${productName}${productId ? ` [${productId}]` : ''}`);
  out.push('');
  out.push(`Cliente: ${name.trim()}`);
  out.push(`Teléfono: ${phone.trim()}`);
  if (comment?.trim()) out.push(`Comentarios: ${comment.trim()}`);
  return out.join('\n');
}
