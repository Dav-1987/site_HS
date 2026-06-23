// Thin wrappers around the marketing tags loaded in index.html. Each call is a
// no-op when the tag failed to load or was blocked (ad blocker, in-app browser,
// CSP), so callers never have to guard `window.fbq` themselves.

// Must match the id in index.html's pixel bootstrap.
export const META_PIXEL_ID = '1469441981616987';

/**
 * Fire a Meta Pixel standard or custom event. Safe to call before fbevents.js
 * has finished loading — fbq queues calls until it's ready.
 * @param {string} event - e.g. 'PageView', 'ViewContent', 'Lead', 'Contact'
 * @param {object} [params] - optional event parameters
 */
export function trackPixel(event, params) {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    window.fbq('track', event, params);
  }
}

/**
 * Build Meta advanced-matching fields from a name + Spanish phone. Values are
 * normalized (digits-only phone with country code, lower-cased name) but NOT
 * hashed here — fbevents.js SHA-256-hashes them in the browser before they
 * leave. Returns only the fields we actually have.
 */
export function buildUserData({ name, phone } = {}) {
  const data = {};
  let digits = (phone || '').replace(/\D/g, '').replace(/^00/, '');
  if (digits.length === 9) digits = '34' + digits; // bare Spanish national number
  if (digits) data.ph = digits;
  const parts = (name || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (parts[0]) data.fn = parts[0];
  if (parts.length > 1) data.ln = parts.slice(1).join(' ');
  return data;
}

/**
 * Set Meta Pixel advanced-matching data for subsequent events. Pass plain
 * values — fbevents.js normalizes + SHA-256-hashes them before they leave the
 * browser. Re-calling init only refreshes matching data; it does not re-fire
 * PageView. No-op when fbq is unavailable or there is no data to send.
 */
export function setPixelUserData(userData) {
  if (
    typeof window !== 'undefined' &&
    typeof window.fbq === 'function' &&
    userData &&
    Object.keys(userData).length > 0
  ) {
    window.fbq('init', META_PIXEL_ID, userData);
  }
}
