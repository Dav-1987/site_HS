// Order notification channels: Telegram bot + SMTP email. Each channel is
// optional — it is used only when its env vars are present (see .env.example):
//   Telegram: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
//   Email:    SMTP_HOST, SMTP_USER, SMTP_PASS,
//             SMTP_PORT (465), ORDER_EMAIL_TO (SMTP_USER), ORDER_EMAIL_FROM (SMTP_USER)

import nodemailer from 'nodemailer';

export function telegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export function emailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Telegram API ${res.status}: ${body.slice(0, 300)}`);
  }
}

export async function sendOrderEmail(subject, text) {
  const port = Number(process.env.SMTP_PORT) || 465;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: process.env.ORDER_EMAIL_FROM || process.env.SMTP_USER,
    to: process.env.ORDER_EMAIL_TO || process.env.SMTP_USER,
    subject,
    text,
  });
}
