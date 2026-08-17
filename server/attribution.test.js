import { describe, it, expect } from 'vitest';
import { describeAttribution, sanitizeAttribution } from './attribution.js';

describe('sanitizeAttribution', () => {
  it('keeps only recognized fields', () => {
    expect(
      sanitizeAttribution({
        utm_source: 'ig',
        utm_campaign: 'tocadores-agosto',
        evil: 'DROP TABLE orders',
        nested: { a: 1 },
      }),
    ).toEqual({ utm_source: 'ig', utm_campaign: 'tocadores-agosto' });
  });

  it('trims values and caps their length', () => {
    const long = sanitizeAttribution({ utm_campaign: 'x'.repeat(500) });
    expect(long.utm_campaign).toHaveLength(200);
    expect(sanitizeAttribution({ utm_source: '  ig  ' })).toEqual({ utm_source: 'ig' });
  });

  it('returns null when nothing usable is left', () => {
    expect(sanitizeAttribution(null)).toBeNull();
    expect(sanitizeAttribution('ig')).toBeNull();
    expect(sanitizeAttribution([{ utm_source: 'ig' }])).toBeNull();
    expect(sanitizeAttribution({ evil: 'x' })).toBeNull();
    expect(sanitizeAttribution({ utm_source: '   ' })).toBeNull();
  });

  it('accepts a plausible timestamp only', () => {
    expect(sanitizeAttribution({ ts: 1755000000000 })).toEqual({ ts: 1755000000000 });
    expect(sanitizeAttribution({ ts: -1 })).toBeNull();
    expect(sanitizeAttribution({ ts: 'yesterday' })).toBeNull();
  });
});

describe('describeAttribution', () => {
  it('names the ad network behind a click id', () => {
    expect(describeAttribution({ network: 'google_ads', clickIdParam: 'gclid' })).toBe(
      'Google Ads (gclid)',
    );
    expect(describeAttribution({ network: 'meta_ads', clickIdParam: 'fbclid' })).toBe(
      'Meta Ads (fbclid)',
    );
  });

  it('adds the placement and campaign from utm parameters', () => {
    expect(
      describeAttribution({
        network: 'meta_ads',
        clickIdParam: 'fbclid',
        utm_source: 'ig',
        utm_campaign: 'tocadores-agosto',
      }),
    ).toBe('Meta Ads · Instagram — «tocadores-agosto»');
  });

  it('does not repeat a source that already names the network', () => {
    expect(describeAttribution({ network: 'google_ads', utm_source: 'google' })).toBe('Google Ads');
  });

  it('falls back to the referrer when there are no campaign markers', () => {
    expect(describeAttribution({ referrer: 'https://www.google.com/search?q=tocador' })).toBe(
      'Google',
    );
    expect(describeAttribution({ referrer: 'https://l.instagram.com/' })).toBe('Instagram');
    expect(describeAttribution({ referrer: 'https://es.wallapop.com/item/1' })).toBe('Wallapop');
  });

  it('reports an unknown referrer host verbatim', () => {
    expect(describeAttribution({ referrer: 'https://www.decoblog.es/post' })).toBe('decoblog.es');
  });

  it('reports direct traffic when nothing is known', () => {
    expect(describeAttribution(null)).toBe('Directo / desconocido');
    expect(describeAttribution({})).toBe('Directo / desconocido');
    expect(describeAttribution({ landing: '/tocadores' })).toBe('Directo / desconocido');
  });
});
