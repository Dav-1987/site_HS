// Turns the raw attribution snapshot captured in the browser
// (src/lib/attribution.js) into the one-line label staff read in Telegram and
// in /admin, and sanitizes it before it reaches the database.
//
// Pure and side-effect free so both the notification text and the admin list
// derive the same label from the same code — the label is never stored, only
// the raw snapshot, so improving this function also improves old orders.

// Keys we are willing to persist. Anything else in the payload is dropped
// rather than stored: the snapshot arrives from an untrusted client, and a
// crafted URL must not be able to write arbitrary JSON into our orders table.
const ALLOWED_KEYS = [
  'ts',
  'landing',
  'clickId',
  'clickIdParam',
  'network',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'referrer',
];

const MAX_VALUE_LENGTH = 200;

const NETWORK_LABELS = {
  google_ads: 'Google Ads',
  meta_ads: 'Meta Ads',
  tiktok_ads: 'TikTok Ads',
  bing_ads: 'Bing Ads',
};

// Referrer hosts worth naming. Everything else falls back to the bare host,
// which is more useful than a guess.
const REFERRER_LABELS = [
  [/(^|\.)google\./, 'Google'],
  [/(^|\.)bing\./, 'Bing'],
  [/(^|\.)duckduckgo\./, 'DuckDuckGo'],
  [/(^|\.)yandex\./, 'Yandex'],
  [/(^|\.)instagram\./, 'Instagram'],
  [/(^|\.)facebook\./, 'Facebook'],
  [/(^|\.)fb\./, 'Facebook'],
  [/(^|\.)youtube\./, 'YouTube'],
  [/(^|\.)tiktok\./, 'TikTok'],
  [/(^|\.)pinterest\./, 'Pinterest'],
  [/(^|\.)wallapop\./, 'Wallapop'],
  [/(^|\.)milanuncios\./, 'Milanuncios'],
  [/(^|\.)t\.co$/, 'X (Twitter)'],
  [/(^|\.)whatsapp\./, 'WhatsApp'],
  [/(^|\.)telegram\./, 'Telegram'],
];

// utm_source values advertisers commonly use, mapped to how a human reads them.
// `ig`/`fb`/`an`/`msg` are what Meta's {{site_source_name}} macro fills in, so
// all four arrive verbatim from the ad account's URL parameters.
const SOURCE_LABELS = {
  ig: 'Instagram',
  instagram: 'Instagram',
  fb: 'Facebook',
  facebook: 'Facebook',
  an: 'Audience Network',
  msg: 'Messenger',
  google: 'Google',
  bing: 'Bing',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  email: 'Email',
  newsletter: 'Newsletter',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
};

function cleanValue(value) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().slice(0, MAX_VALUE_LENGTH);
  return trimmed || undefined;
}

/**
 * Keep only the fields we recognize, as trimmed strings (plus the numeric
 * timestamp). Returns null when nothing usable is left, so callers can store
 * SQL NULL instead of an empty object.
 */
export function sanitizeAttribution(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const out = {};
  for (const key of ALLOWED_KEYS) {
    if (key === 'ts') {
      if (Number.isFinite(input.ts) && input.ts > 0) out.ts = Math.floor(input.ts);
      continue;
    }
    const value = cleanValue(input[key]);
    if (value) out[key] = value;
  }
  return Object.keys(out).length ? out : null;
}

function referrerLabel(referrer) {
  let host;
  try {
    host = new URL(referrer).host.replace(/^www\./, '');
  } catch {
    return undefined;
  }
  if (!host) return undefined;
  for (const [pattern, label] of REFERRER_LABELS) {
    if (pattern.test(host)) return label;
  }
  return host;
}

function sourceLabel(utmSource) {
  const key = utmSource.toLowerCase();
  return SOURCE_LABELS[key] ?? utmSource;
}

/**
 * One human-readable line describing where the visitor came from, e.g.
 * "Meta Ads · Instagram — «tocadores-agosto»". Signals are ranked by how much
 * we can trust them: a click id proves the ad click, utm parameters are what
 * the advertiser declared, and a referrer is a weak last resort.
 */
export function describeAttribution(attribution) {
  const data = sanitizeAttribution(attribution);
  if (!data) return 'Directo / desconocido';

  const parts = [];

  if (data.network) parts.push(NETWORK_LABELS[data.network] ?? data.network);
  if (data.utm_source) {
    const label = sourceLabel(data.utm_source);
    // Avoid "Meta Ads · Meta Ads" when the utm just repeats the network.
    if (!parts.some((part) => part.toLowerCase().includes(label.toLowerCase()))) parts.push(label);
  }
  if (!parts.length && data.utm_medium) parts.push(data.utm_medium);
  if (!parts.length) {
    const fromReferrer = data.referrer ? referrerLabel(data.referrer) : undefined;
    if (fromReferrer) parts.push(fromReferrer);
  }
  if (!parts.length) return 'Directo / desconocido';

  let label = parts.join(' · ');
  if (data.utm_campaign) label += ` — «${data.utm_campaign}»`;
  else if (data.clickIdParam) label += ` (${data.clickIdParam})`;
  return label;
}

/**
 * The line under it: which ad inside the campaign. Meta's URL macros put the
 * ad set in utm_content, the ad in utm_term and the placement in utm_medium;
 * Google Ads puts the keyword in utm_term. Empty unless the markup actually
 * names the ad set or the ad — a line reading only "(organic)" says nothing
 * that the source above hasn't said already.
 */
export function describeAdDetail(attribution) {
  const data = sanitizeAttribution(attribution);
  if (!data) return '';
  const named = [data.utm_content, data.utm_term].filter(Boolean).join(' · ');
  if (!named) return '';
  return data.utm_medium ? `${named} (${data.utm_medium})` : named;
}

/**
 * The page the visit started on. Worth a line of its own even for a visitor
 * with no campaign at all: for a direct visit it is the only thing known about
 * where the order came from.
 */
export function entryPath(attribution) {
  return sanitizeAttribution(attribution)?.landing ?? '';
}
