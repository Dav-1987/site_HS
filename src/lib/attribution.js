// Where the visitor came from, captured in the browser and attached to the
// order request so staff see the channel next to the phone number.
//
// The snapshot has to be taken on the landing page: by the time someone opens
// the order modal they have usually navigated several pages, and the campaign
// parameters are long gone from the URL. So we persist it and read it back at
// submit time.

const STORAGE_KEY = 'hs-attribution';
// A snapshot older than this describes a visit the customer no longer connects
// to today's order, so it is dropped rather than credited to a stale campaign.
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

// Click ids, in the order we prefer them. Each is proof the visit came from
// that network's ad — far stronger than a referrer, which in-app browsers and
// messengers routinely drop.
const CLICK_ID_PARAMS = [
  ['gclid', 'google_ads'],
  ['wbraid', 'google_ads'],
  ['gbraid', 'google_ads'],
  ['fbclid', 'meta_ads'],
  ['ttclid', 'tiktok_ads'],
  ['msclkid', 'bing_ads'],
];

const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

// Long enough for real campaign names, short enough that a crafted URL cannot
// bloat the order payload or the Telegram message.
const MAX_VALUE_LENGTH = 200;

function clean(value) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().slice(0, MAX_VALUE_LENGTH);
  return trimmed || undefined;
}

/**
 * Read the campaign markers out of a URL + referrer pair. Exported for tests;
 * `captureAttribution` is what the app calls.
 */
export function readAttribution({ url, referrer } = {}) {
  const params = new URL(url).searchParams;
  const snapshot = { ts: Date.now(), landing: new URL(url).pathname };

  for (const [param, network] of CLICK_ID_PARAMS) {
    const value = clean(params.get(param));
    if (value) {
      snapshot.clickId = value;
      snapshot.clickIdParam = param;
      snapshot.network = network;
      break;
    }
  }

  for (const param of UTM_PARAMS) {
    const value = clean(params.get(param));
    if (value) snapshot[param] = value;
  }

  const ref = clean(referrer);
  // A same-site referrer means an internal navigation, not a traffic source.
  if (ref) {
    try {
      if (new URL(ref).host !== new URL(url).host) snapshot.referrer = ref;
    } catch {
      snapshot.referrer = ref;
    }
  }

  return snapshot;
}

/** True when the snapshot names a campaign rather than just a referrer. */
function hasCampaignMarkers(snapshot) {
  return Boolean(snapshot.clickId || snapshot.utm_source || snapshot.utm_campaign);
}

function readStored(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.ts !== 'number' || Date.now() - parsed.ts > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    // Private mode, disabled storage, or a hand-edited value: attribution is a
    // nice-to-have, never a reason to break the page.
    return null;
  }
}

/**
 * Persist where this visit came from.
 *
 * A fresh ad click always wins: the customer who clicked today's Instagram ad
 * should be credited to it, not to the organic search that first brought them
 * to the site weeks ago (this is "last non-direct click", the same rule Google
 * and Meta report on). A visit with no campaign markers never overwrites a
 * stored one — otherwise every later direct visit would erase the source.
 */
export function captureAttribution({ storage, url, referrer } = {}) {
  const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  const href = url ?? (typeof window !== 'undefined' ? window.location.href : undefined);
  if (!store || !href) return null;

  const current = readAttribution({
    url: href,
    referrer: referrer ?? (typeof document !== 'undefined' ? document.referrer : ''),
  });
  const stored = readStored(store);

  if (stored && !hasCampaignMarkers(current)) return stored;

  try {
    store.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Storage full or blocked — the in-memory value still reaches this order.
  }
  return current;
}

/** The stored snapshot, or null. Called when an order is submitted. */
export function getAttribution(storage) {
  const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  return store ? readStored(store) : null;
}
