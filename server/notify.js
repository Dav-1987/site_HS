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

// The VPS's route to Telegram's datacenter has a lossy hop (~30% packet loss
// observed via mtr), so a single request intermittently times out even though
// the credentials/network are otherwise fine. Retry a few times before giving
// up — most attempts succeed on the 2nd or 3rd try.
export async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body = JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text });

  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`Telegram API ${res.status}: ${errBody.slice(0, 300)}`);
      }
      return;
    } catch (err) {
      lastErr = err;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  throw lastErr;
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
