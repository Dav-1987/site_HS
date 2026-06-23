// Thin wrappers around the marketing tags loaded in index.html. Each call is a
// no-op when the tag failed to load or was blocked (ad blocker, in-app browser,
// CSP), so callers never have to guard `window.fbq` themselves.

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
