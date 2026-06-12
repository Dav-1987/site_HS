// Pure helpers for the public order endpoint: payload validation, catalog
// resolution and message formatting. Side-effect free so they can be
// unit-tested without Express or the DB.

const MAX_LINES = 50;
const MAX_QTY = 99;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validate the customer payload; returns an error string or null. */
export function validateOrder(body) {
  if (!body || typeof body !== 'object') return 'invalid payload';
  if (typeof body.name !== 'string' || !body.name.trim()) return 'name is required';
  if (body.name.length > 200) return 'name is too long';
  if (typeof body.phone !== 'string' || !body.phone.trim()) return 'phone is required';
  if (body.phone.length > 50) return 'phone is too long';
  if (body.email) {
    if (typeof body.email !== 'string' || body.email.length > 200 || !EMAIL_RE.test(body.email))
      return 'invalid email';
  }
  if (body.comment !== undefined && typeof body.comment !== 'string') return 'invalid comment';
  if (body.comment && body.comment.length > 2000) return 'comment is too long';
  if (!Array.isArray(body.items) || body.items.length === 0) return 'cart is empty';
  if (body.items.length > MAX_LINES) return 'too many items';
  for (const item of body.items) {
    if (typeof item?.id !== 'string' || !item.id || item.id.length > 100) return 'invalid item id';
    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) return 'invalid item quantity';
  }
  return null;
}

/**
 * Resolve order items against the live catalog. Names and prices always come
 * from the server-side catalog — the client only sends ids and quantities.
 * Unknown ids are skipped; returns [] when nothing resolves.
 */
export function resolveOrderItems(items, categories) {
  const lines = [];
  for (const { id, qty } of items) {
    for (const category of categories) {
      const product = category.products.find((p) => p.id === id);
      if (!product) continue;
      const price = Number(product.price) || 0;
      const n = Number(qty);
      lines.push({
        id,
        qty: n,
        name: product.name,
        category: category.name?.es || category.slug,
        price,
        total: price * n,
      });
      break;
    }
  }
  return lines;
}

/** Plain-text order summary shared by the Telegram and email notifications. */
export function formatOrderText({ name, phone, email, comment }, lines) {
  const total = lines.reduce((sum, l) => sum + l.total, 0);
  const out = ['🛒 Nueva solicitud de pedido — HS Muebles', ''];
  out.push(`Cliente: ${name.trim()}`);
  out.push(`Teléfono: ${phone.trim()}`);
  if (email?.trim()) out.push(`Email: ${email.trim()}`);
  if (comment?.trim()) out.push(`Comentario: ${comment.trim()}`);
  out.push('', 'Pedido:');
  lines.forEach((l, i) => {
    out.push(`${i + 1}. ${l.name} (${l.category}) — ${l.qty} × ${l.price} € = ${l.total} €`);
  });
  out.push('', `Total: ${total} €`);
  return out.join('\n');
}
