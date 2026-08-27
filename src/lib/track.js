// Thin wrappers around the marketing tags loaded in index.html. Each call is a
// no-op when the tag failed to load or was blocked (ad blocker, in-app browser,
// CSP), so callers never have to guard `window.fbq` themselves.

/**
 * Push a custom event onto the dataLayer GTM's base script (see index.html)
 * already reads. Every gtag() call writes here too, but under its own
 * arguments-array shape; this is the plain `{ event, ...data }` object GTM's
 * "Custom Event" trigger type matches on, for tags configured entirely inside
 * Tag Manager's UI rather than in this file — Pinterest's own Tag template is
 * the first of those. `product_id` is deliberately the key name: it is what
 * Pinterest's tag calls the field its AddToCart/Checkout/PageVisit events read
 * for retargeting and audience building.
 * No-op outside a browser (SSR/prerender).
 */
export function pushDataLayer(event, data) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...data });
}

// Must match the id in index.html's pixel bootstrap.
export const META_PIXEL_ID = '2527019284431321';

/**
 * Fire a Meta Pixel standard or custom event. Safe to call before fbevents.js
 * has finished loading — fbq queues calls until it's ready.
 * @param {string} event - e.g. 'PageView', 'ViewContent', 'Lead', 'Contact'
 * @param {object} [params] - optional event parameters
 * @param {object} [options] - fbq options, e.g. { eventID } to dedupe with the
 *   server-side Conversions API copy of the same event
 */
export function trackPixel(event, params, options) {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    if (options !== undefined) window.fbq('track', event, params, options);
    else window.fbq('track', event, params);
  }
}

/**
 * A Spanish phone as typed into the form → bare digits with the country code.
 * Mirrors `normalizePhone` in server/meta-capi.js, which does the same to the
 * server's copy of the same number; the two must agree or the deduplicated
 * halves of a Lead carry different identities.
 */
function normalizeEsPhone(phone) {
  const digits = (phone || '').replace(/\D/g, '').replace(/^00/, '');
  if (!digits) return '';
  return digits.length === 9 ? `34${digits}` : digits; // bare national number
}

/**
 * Build Meta advanced-matching fields from a name + Spanish phone. Values are
 * normalized (digits-only phone with country code, lower-cased name) but NOT
 * hashed here — fbevents.js SHA-256-hashes them in the browser before they
 * leave. Returns only the fields we actually have.
 */
export function buildUserData({ name, phone } = {}) {
  const data = {};
  const digits = normalizeEsPhone(phone);
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

// Google Ads conversion tracking. The base gtag.js is loaded in index.html
// (shared with GA4) and also configured there for AW-18251052543, so this is a
// thin wrapper like trackPixel — a no-op when gtag failed to load or was blocked.
export const GOOGLE_ADS_ID = 'AW-18251052543';
// Conversion label for the "Lead" action (Submit lead form). From Google Ads →
// Conversions → Lead → conversion label.
const GOOGLE_ADS_LEAD_LABEL = 'aTAPCI6368QcEP_r4_5D';

/**
 * Fire the Google Ads "Lead" conversion. Matches the value/currency configured
 * on the conversion action (1 EUR, same value for all). Safe to call before
 * gtag.js has loaded — calls queue on the dataLayer.
 */
export function trackGoogleAdsLead() {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'conversion', {
      send_to: `${GOOGLE_ADS_ID}/${GOOGLE_ADS_LEAD_LABEL}`,
      value: 1.0,
      currency: 'EUR',
    });
  }
}

/**
 * Build the enhanced-conversions payload from what the order form collects.
 * Google matches on either the phone or a complete address, so both are sent:
 * we have no email, and email is what matches best, so the two weaker signals
 * together are what we have. Shapes and key names are Google's, not ours —
 * `phone_number` must be E.164, and the address block is only worth sending
 * with a country beside it.
 *
 * Values go out in the clear from here; the Google tag normalizes and
 * SHA-256-hashes them in the browser before anything leaves the page.
 */
export function buildGoogleUserData({ name, phone, postalCode } = {}) {
  const data = {};
  const digits = normalizeEsPhone(phone);
  if (digits) data.phone_number = `+${digits}`;

  const address = {};
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts[0]) address.first_name = parts[0];
  if (parts.length > 1) address.last_name = parts.slice(1).join(' ');
  const zip = (postalCode || '').trim();
  if (zip) address.postal_code = zip;
  if (Object.keys(address).length > 0) {
    address.country = 'ES'; // the form is Spain-only; there is no field to read
    data.address = address;
  }
  return data;
}

/**
 * Attach the customer data Google should match this conversion against. Must
 * run *before* the conversion event — gtag reads whatever `user_data` is set at
 * the moment the event fires, so calling it afterwards silently matches on
 * nothing. No-op when gtag is unavailable or there is nothing to match on.
 */
export function setGoogleAdsUserData(userData) {
  if (
    typeof window !== 'undefined' &&
    typeof window.gtag === 'function' &&
    userData &&
    Object.keys(userData).length > 0
  ) {
    window.gtag('set', 'user_data', userData);
  }
}

// GA4 measurement id, shared with the base gtag.js in index.html.
export const GA4_ID = 'G-F59Y5J11MF';

/**
 * Mirror the lead into GA4 as the standard `generate_lead` event. The Google
 * Ads conversion above goes only to the Ads account, so without this GA4 has no
 * idea a lead happened and the two platforms cannot be reconciled. Pinned to
 * `send_to: GA4_ID` so it does not also land in Ads as a stray unmapped event.
 */
export function trackGa4Lead({ value, currency = 'EUR' } = {}) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'generate_lead', {
      send_to: GA4_ID,
      currency,
      ...(value > 0 ? { value } : null),
    });
  }
}

/**
 * Read Meta's browser identifiers for server-side (Conversions API) matching:
 * `_fbp` (browser id) and `_fbc` (click id). When `_fbc` isn't set yet but the
 * URL carries an `fbclid`, derive it in Meta's `fb.1.<ts>.<fbclid>` format.
 */
export function getFbCookies() {
  if (typeof document === 'undefined') return {};
  const read = (name) => {
    const m = document.cookie.match('(?:^|; )' + name + '=([^;]+)');
    return m ? decodeURIComponent(m[1]) : undefined;
  };
  let fbc = read('_fbc');
  if (!fbc && typeof window !== 'undefined') {
    const fbclid = new URLSearchParams(window.location.search).get('fbclid');
    if (fbclid) fbc = `fb.1.${Date.now()}.${fbclid}`;
  }
  return { fbp: read('_fbp'), fbc };
}
