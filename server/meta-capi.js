// Meta Conversions API — server-side copy of the Lead event sent straight to
// Meta's Graph API, bypassing the browser pixel (which IG/FB in-app browsers
// routinely drop). The browser pixel and this share an `event_id` so Meta
// deduplicates. Best-effort: callers must never let a failure block the order.
//
// Env: META_PIXEL_ID, META_CAPI_TOKEN (required), META_GRAPH_VERSION (optional),
//      META_TEST_EVENT_CODE (optional — routes events to Events Manager > Test).

import { createHash } from 'node:crypto';
import { normalizeMetaCountry, normalizeMetaPhone, normalizeMetaPostalCode } from './order-data.js';

// Meta supports each version for ~2 years from release; v21.0 (Oct 2024) is
// close to that line. Override with META_GRAPH_VERSION when bumping again.
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v26.0';

export function metaCapiConfigured() {
  return Boolean(process.env.META_PIXEL_ID && process.env.META_CAPI_TOKEN);
}

const sha256 = (v) => createHash('sha256').update(v).digest('hex');

/**
 * Build the Conversions API event payload for a Lead. Pure + deterministic so
 * it can be unit-tested; PII (phone/name) is normalized and SHA-256 hashed here.
 */
export function buildLeadEvent({
  name,
  phone,
  country,
  postalCode,
  eventId,
  fbp,
  fbc,
  eventSourceUrl,
  clientIp,
  userAgent,
  productName,
  productId,
  value,
}) {
  const parts = (name || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  const ph = normalizeMetaPhone(phone, country);
  const normalizedCountry = normalizeMetaCountry(country);
  const zp = normalizeMetaPostalCode(postalCode);

  const user_data = {};
  if (ph) user_data.ph = [sha256(ph)];
  if (normalizedCountry) user_data.country = [sha256(normalizedCountry)];
  if (zp) user_data.zp = [sha256(zp)];
  if (parts[0]) user_data.fn = [sha256(parts[0])];
  if (parts.length > 1) user_data.ln = [sha256(parts.slice(1).join(' '))];
  if (clientIp) user_data.client_ip_address = clientIp;
  if (userAgent) user_data.client_user_agent = userAgent;
  if (fbp) user_data.fbp = fbp;
  if (fbc) user_data.fbc = fbc;

  const custom_data = { content_type: 'product' };
  if (productName) custom_data.content_name = productName;
  if (productId) custom_data.content_ids = [productId];
  // Must match what the browser Lead sends, or the two halves of a deduplicated
  // event disagree on value. Taken from the catalog server-side, never from the
  // request body — the client must not be able to price its own conversion.
  if (Number(value) > 0) {
    custom_data.value = Number(value);
    custom_data.currency = 'EUR';
  }

  const event = {
    event_name: 'Lead',
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    user_data,
    custom_data,
  };
  if (eventId) event.event_id = eventId;
  if (eventSourceUrl) event.event_source_url = eventSourceUrl;
  return event;
}

/** Send a Lead to Meta CAPI. Resolves silently when not configured; throws on HTTP error. */
export async function sendLeadEvent(input) {
  if (!metaCapiConfigured()) return;

  const body = {
    data: [buildLeadEvent(input)],
    access_token: process.env.META_CAPI_TOKEN,
  };
  if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE;

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${process.env.META_PIXEL_ID}/events`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Meta CAPI ${res.status}: ${t.slice(0, 300)}`);
  }
}
