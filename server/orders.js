// Persistent order history — Telegram/email are best-effort notifications
// (see notify.js), this table is the durable record so a flaky Telegram
// delivery or a log rotation never means the order itself is lost.

import pool from './db.js';
import {
  describeAdDetail,
  describeAttribution,
  entryPath,
  sanitizeAttribution,
} from './attribution.js';
import { cleanUserAgent, describeDevice } from './device.js';
import { isOrderStatus } from './order-data.js';

export async function saveOrder({
  eventId,
  name,
  phone,
  country,
  postalCode,
  address,
  comment,
  productId,
  productName,
  price,
  attribution,
  userAgent,
}) {
  const sanitizedAttribution = sanitizeAttribution(attribution);
  const { rows } = await pool.query(
    `INSERT INTO orders (event_id, name, phone, country, postal_code, address, comment, product_id, product_name, price, attribution, user_agent)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (event_id) WHERE event_id IS NOT NULL DO NOTHING
     RETURNING id`,
    [
      eventId,
      name,
      phone,
      country,
      postalCode ?? '',
      address ?? '',
      comment ?? '',
      productId,
      productName,
      Number.isFinite(price) ? price : null,
      sanitizedAttribution ? JSON.stringify(sanitizedAttribution) : null,
      cleanUserAgent(userAgent),
    ],
  );
  if (rows[0]) return { id: rows[0].id, created: true };

  // A concurrent INSERT with the same event id may have made us wait at the
  // unique index. Use a second statement so it gets a fresh MVCC snapshot and
  // can always see the committed winner.
  const existing = await pool.query('SELECT id FROM orders WHERE event_id = $1', [eventId]);
  if (!existing.rows[0]) throw new Error('Idempotent order could not be resolved');
  return { id: existing.rows[0].id, created: false };
}

export async function markOrderTelegramSent(id) {
  await pool.query('UPDATE orders SET telegram_sent = true WHERE id = $1', [id]);
}

export async function markOrderEmailSent(id) {
  await pool.query('UPDATE orders SET email_sent = true WHERE id = $1', [id]);
}

/** Delete an order by id. Returns false if no row matched. */
export async function deleteOrder(id) {
  const { rowCount } = await pool.query('DELETE FROM orders WHERE id = $1', [id]);
  return rowCount > 0;
}

const MAX_ORDERS_LISTED = 500;

// The owner's note is free text for themselves; the cap only keeps a pasted
// wall of text out of the table.
export const MAX_ORDER_NOTE_LENGTH = 1000;

const ORDER_COLUMNS = `id, created_at, name, phone, country, postal_code, address, comment, product_id,
  product_name, price, attribution, user_agent, telegram_sent, email_sent, status, status_changed_at, note`;

export async function listOrders() {
  const { rows } = await pool.query(
    `SELECT ${ORDER_COLUMNS} FROM orders ORDER BY created_at DESC LIMIT $1`,
    [MAX_ORDERS_LISTED],
  );
  return rows.map(toOrder);
}

/**
 * When an order came in and from which browser — what server/visit.js finds
 * it in the access log by. Null when no order has this id.
 */
export async function getOrderOrigin(id) {
  const { rows } = await pool.query('SELECT created_at, user_agent FROM orders WHERE id = $1', [
    id,
  ]);
  return rows[0] ? { createdAt: rows[0].created_at, userAgent: rows[0].user_agent } : null;
}

/**
 * Validates an /admin edit of an order: a new status, a new note, or both.
 * Returns `{ patch }` or `{ error }`; any other field in the body is ignored —
 * the customer's own details are never editable from here.
 */
export function parseOrderPatch(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Expected a JSON object' };
  }
  const patch = {};
  if (body.status !== undefined) {
    if (!isOrderStatus(body.status)) return { error: 'Unknown order status' };
    patch.status = body.status;
  }
  if (body.note !== undefined) {
    if (typeof body.note !== 'string') return { error: 'Note must be a string' };
    if (body.note.length > MAX_ORDER_NOTE_LENGTH) {
      return { error: `Note is longer than ${MAX_ORDER_NOTE_LENGTH} characters` };
    }
    patch.note = body.note;
  }
  if (!Object.keys(patch).length) return { error: 'Nothing to update' };
  return { patch };
}

/**
 * Applies a patch from parseOrderPatch(). `status_changed_at` moves only when
 * the status really changes, so sending the same status again (a double click,
 * a retry) keeps the time the order actually entered it. Every SET expression
 * reads the row as it was before this UPDATE, so the CASE compares against the
 * old status. Returns the updated order, or null when no order has this id.
 */
export async function updateOrder(id, { status, note }) {
  const { rows } = await pool.query(
    `UPDATE orders SET
       status_changed_at = CASE
         WHEN $2::text IS NOT NULL AND $2::text IS DISTINCT FROM status THEN NOW()
         ELSE status_changed_at
       END,
       status = COALESCE($2::text, status),
       note = COALESCE($3::text, note)
     WHERE id = $1
     RETURNING ${ORDER_COLUMNS}`,
    [id, status ?? null, note ?? null],
  );
  return rows[0] ? toOrder(rows[0]) : null;
}

function toOrder(r) {
  return {
    id: Number(r.id),
    createdAt: r.created_at,
    name: r.name,
    phone: r.phone,
    country: r.country ?? null,
    postalCode: r.postal_code,
    address: r.address,
    comment: r.comment,
    productId: r.product_id,
    productName: r.product_name,
    price: r.price === null ? null : Number(r.price),
    // Derived, never stored — see server/attribution.js and server/device.js.
    // /admin shows the same lines the order notification carries, from the
    // same code.
    attributionLabel: describeAttribution(r.attribution),
    adDetail: describeAdDetail(r.attribution),
    entry: entryPath(r.attribution),
    device: describeDevice(r.user_agent),
    telegramSent: r.telegram_sent,
    emailSent: r.email_sent,
    // null for orders saved before statuses existed — see migrate.sql.
    status: r.status ?? null,
    statusChangedAt: r.status_changed_at ?? null,
    note: r.note ?? '',
  };
}
