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

export async function listOrders() {
  const { rows } = await pool.query(
    `SELECT id, created_at, name, phone, country, postal_code, address, comment, product_id, product_name, price, attribution, user_agent, telegram_sent, email_sent
     FROM orders ORDER BY created_at DESC LIMIT $1`,
    [MAX_ORDERS_LISTED],
  );
  return rows.map((r) => ({
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
  }));
}
