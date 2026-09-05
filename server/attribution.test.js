import { describe, it, expect } from 'vitest';
import {
  describeAdDetail,
  describeAttribution,
  entryPath,
  sanitizeAttribution,
} from './attribution.js';

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

// What Meta's URL macros actually put in the parameters, as the account is set
// up: utm_source={{site_source_name}}, utm_medium={{placement}},
// utm_campaign={{campaign.name}}, utm_content={{adset.name}},
// utm_term={{ad.name}}.
describe('a Meta ad, parameter by parameter', () => {
  const fromAd = {
    network: 'meta_ads',
    clickIdParam: 'fbclid',
    utm_source: 'ig',
    utm_medium: 'Instagram_Reels',
    utm_campaign: 'Tocadores Septiembre',
    utm_content: 'ADS_Tocadores_25-45',
    utm_term: 'video_tocador_01',
    landing: '/tocadores',
  };

  it('names the network, the placement it was seen in and the campaign', () => {
    expect(describeAttribution(fromAd)).toBe('Meta Ads · Instagram — «Tocadores Septiembre»');
  });

  it('names the ad set, the ad and the placement underneath', () => {
    expect(describeAdDetail(fromAd)).toBe(
      'ADS_Tocadores_25-45 · video_tocador_01 (Instagram_Reels)',
    );
  });

  it('reads the two placements Meta serves besides the apps themselves', () => {
    expect(describeAttribution({ ...fromAd, utm_source: 'an' })).toContain('Audience Network');
    expect(describeAttribution({ ...fromAd, utm_source: 'msg' })).toContain('Messenger');
  });
});

describe('describeAdDetail', () => {
  it('drops the placement when it is all there is', () => {
    // Pinterest, organic: naming "(organic)" alone would add nothing to the
    // source line above it.
    expect(describeAdDetail({ utm_source: 'Pinterest', utm_medium: 'organic' })).toBe('');
    expect(describeAdDetail(null)).toBe('');
  });

  it('names whichever of the two the markup carries', () => {
    expect(describeAdDetail({ utm_content: 'grupo' })).toBe('grupo');
    expect(describeAdDetail({ utm_term: 'anuncio' })).toBe('anuncio');
  });
});

describe('entryPath', () => {
  it('is the page the visit started on — the only clue a direct visit leaves', () => {
    expect(entryPath({ landing: '/otros-modelos/Tocador-T-31' })).toBe(
      '/otros-modelos/Tocador-T-31',
    );
    expect(entryPath(null)).toBe('');
  });
});
