import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SHIPPING_COUNTRY,
  getCountryName,
  getShippingCountryOptions,
  isShippingCountry,
  isValidPhone,
  isValidPostalCode,
  normalizeIsoCountryCode,
  normalizeMetaCountry,
  normalizeMetaPhone,
  normalizeMetaPostalCode,
  normalizePhone,
  normalizePostalCode,
  normalizeShippingCountry,
} from './order-data.js';

describe('shipping countries', () => {
  it('defaults to Spain and exposes only the approved delivery countries', () => {
    expect(DEFAULT_SHIPPING_COUNTRY).toBe('ES');
    expect(getShippingCountryOptions('es')).toEqual([
      { code: 'ES', name: 'España' },
      { code: 'FR', name: 'Francia' },
      { code: 'PT', name: 'Portugal' },
    ]);
  });

  it('normalizes ISO alpha-2 codes but rejects unsupported delivery countries', () => {
    expect(normalizeIsoCountryCode(' fr ')).toBe('FR');
    expect(normalizeIsoCountryCode('FRA')).toBe('');
    expect(normalizeShippingCountry(' pt ')).toBe('PT');
    expect(normalizeShippingCountry('DE')).toBe('');
    expect(isShippingCountry('ES')).toBe(true);
    expect(isShippingCountry('US')).toBe(false);
  });

  it('localizes human-readable country names', () => {
    expect(getCountryName('ES', 'en')).toBe('Spain');
    expect(getCountryName('FR', 'es')).toBe('Francia');
    expect(getCountryName('PT', 'ru')).toBe('Португалия');
  });
});

describe('international phone normalization', () => {
  it('uses the selected delivery country for national-format numbers', () => {
    expect(normalizePhone('612 345 678', 'ES')).toBe('+34612345678');
    expect(normalizePhone('06 12 34 56 78', 'FR')).toBe('+33612345678');
    expect(normalizePhone('912 345 678', 'PT')).toBe('+351912345678');
  });

  it('preserves an explicit international number regardless of delivery country', () => {
    expect(normalizePhone('+374 99 123456', 'FR')).toBe('+37499123456');
    expect(normalizePhone('00374 99 123456', 'PT')).toBe('+37499123456');
  });

  it('does not normalize without an approved delivery country', () => {
    expect(normalizePhone('612345678', '')).toBe('');
    expect(normalizePhone('612345678', 'DE')).toBe('');
  });

  it('rejects malformed and implausible numbers', () => {
    expect(isValidPhone('abc', 'ES')).toBe(false);
    expect(isValidPhone('12', 'FR')).toBe(false);
    expect(isValidPhone('Call me at 612345678', 'ES')).toBe(false);
    expect(isValidPhone('+374 99 123456', 'FR')).toBe(true);
  });

  it('produces Meta phone digits without changing the delivery country', () => {
    expect(normalizeMetaPhone('+374 99 123456', 'FR')).toBe('37499123456');
    expect(normalizeMetaCountry('FR')).toBe('fr');
  });
});

describe('international postal codes', () => {
  it('accepts numeric, hyphenated and alphanumeric formats', () => {
    expect(isValidPostalCode('28001')).toBe(true);
    expect(isValidPostalCode('1000-001')).toBe(true);
    expect(isValidPostalCode('SW1A 1AA')).toBe(true);
    expect(isValidPostalCode('K1A 0B1')).toBe(true);
  });

  it('normalizes whitespace without forcing a five-digit format', () => {
    expect(normalizePostalCode('  SW1A   1AA ')).toBe('SW1A 1AA');
    expect(normalizeMetaPostalCode('  SW1A   1AA ')).toBe('sw1a 1aa');
  });

  it('rejects garbage and implausible lengths', () => {
    expect(isValidPostalCode('!!')).toBe(false);
    expect(isValidPostalCode('2')).toBe(false);
    expect(isValidPostalCode('A'.repeat(20))).toBe(false);
  });
});
