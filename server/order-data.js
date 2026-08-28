import parsePhoneNumber, { getCountryCallingCode } from 'libphonenumber-js/min';

export const DEFAULT_SHIPPING_COUNTRY = 'ES';
export const SHIPPING_COUNTRIES = Object.freeze(['ES', 'FR', 'PT']);

const SHIPPING_COUNTRY_SET = new Set(SHIPPING_COUNTRIES);

const COUNTRY_NAMES = Object.freeze({
  es: Object.freeze({ ES: 'España', FR: 'Francia', PT: 'Portugal' }),
  en: Object.freeze({ ES: 'Spain', FR: 'France', PT: 'Portugal' }),
  ru: Object.freeze({ ES: 'Испания', FR: 'Франция', PT: 'Португалия' }),
});

const POSTAL_CODE_PLACEHOLDERS = Object.freeze({
  ES: '28001',
  FR: '75001',
  PT: '1000-001',
});

// International postal codes are not universally numeric. Keep the validation
// deliberately format-agnostic while rejecting punctuation and implausible
// lengths. This accepts, for example, 28001, 1000-001 and SW1A 1AA.
const POSTAL_CODE_RE = /^[A-Za-z0-9][A-Za-z0-9\s-]{1,10}[A-Za-z0-9]$/;

export function normalizeIsoCountryCode(value) {
  if (typeof value !== 'string') return '';
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : '';
}

export function normalizeShippingCountry(value) {
  const code = normalizeIsoCountryCode(value);
  return SHIPPING_COUNTRY_SET.has(code) ? code : '';
}

export function isShippingCountry(value) {
  return Boolean(normalizeShippingCountry(value));
}

export function getCountryName(value, locale = 'es') {
  const code = normalizeShippingCountry(value);
  if (!code) return '';
  const language = locale === 'en' || locale === 'ru' ? locale : 'es';

  try {
    return (
      new Intl.DisplayNames([language], { type: 'region' }).of(code) ||
      COUNTRY_NAMES[language][code]
    );
  } catch {
    return COUNTRY_NAMES[language][code];
  }
}

export function getShippingCountryOptions(locale = 'es') {
  return SHIPPING_COUNTRIES.map((code) => ({ code, name: getCountryName(code, locale) }));
}

export function getCountryCallingPrefix(value) {
  const country = normalizeShippingCountry(value);
  return country ? `+${getCountryCallingCode(country)}` : '';
}

export function getPostalCodePlaceholder(value) {
  return POSTAL_CODE_PLACEHOLDERS[normalizeShippingCountry(value)] || '';
}

export function normalizePhone(value, shippingCountry) {
  const country = normalizeShippingCountry(shippingCountry);
  if (!country || typeof value !== 'string') return '';

  let input = value.trim();
  if (!input) return '';
  // An explicit international access prefix is user-provided information, not
  // country inference. Convert it to the canonical plus form before parsing.
  if (input.startsWith('00')) input = `+${input.slice(2)}`;

  try {
    const parsed = parsePhoneNumber(input, { defaultCountry: country, extract: false });
    return parsed?.isPossible() ? parsed.number : '';
  } catch {
    return '';
  }
}

export function isValidPhone(value, shippingCountry) {
  return Boolean(normalizePhone(value, shippingCountry));
}

export function normalizePostalCode(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

export function isValidPostalCode(value) {
  return POSTAL_CODE_RE.test(normalizePostalCode(value));
}

export function normalizeMetaCountry(value) {
  return normalizeShippingCountry(value).toLowerCase();
}

export function normalizeMetaPostalCode(value) {
  return normalizePostalCode(value).toLowerCase();
}

export function normalizeMetaPhone(value, shippingCountry) {
  return normalizePhone(value, shippingCountry).replace(/^\+/, '');
}
