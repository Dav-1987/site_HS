// Persistent order history — Telegram/email are best-effort notifications
// (see notify.js), this table is the durable record so a flaky Telegram
// delivery or a log rotation never means the order itself is lost.

import pool from './db.js';

export async function saveOrder({ name, phone, address, comment, productId, productName, price, telegramSent, emailSent }) {
  const { rows } = await pool.query(
    `INSERT INTO orders (name, phone, address, comment, product_id, product_name, price, telegram_sent, email_sent)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id`,
    [name, phone, address ?? '', comment ?? '', productId ?? '', productName ?? '', Number.isFinite(price) ? price : null, telegramSent, emailSent],
  );
  return rows[0].id;
}

export async function markOrderTelegramSent(id) {
  await pool.query('UPDATE orders SET telegram_sent = true WHERE id = $1', [id]);
}

/** Delete an order by id. Returns false if no row matched. */
export async function deleteOrder(id) {
  const { rowCount } = await pool.query('DELETE FROM orders WHERE id = $1', [id]);
  return rowCount > 0;
}

const MAX_ORDERS_LISTED = 500;

export async function listOrders() {
  const { rows } = await pool.query(
    `SELECT id, created_at, name, phone, address, comment, product_id, product_name, price, telegram_sent, email_sent
     FROM orders ORDER BY created_at DESC LIMIT $1`,
    [MAX_ORDERS_LISTED],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    createdAt: r.created_at,
    name: r.name,
    phone: r.phone,
    address: r.address,
    comment: r.comment,
    productId: r.product_id,
    productName: r.product_name,
    price: r.price === null ? null : Number(r.price),
    telegramSent: r.telegram_sent,
    emailSent: r.email_sent,
  }));
}
