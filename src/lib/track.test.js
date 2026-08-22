import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  trackPixel,
  buildUserData,
  setPixelUserData,
  trackGoogleAdsLead,
  trackGa4Lead,
  GOOGLE_ADS_ID,
  GA4_ID,
  META_PIXEL_ID,
} from './track.js';

afterEach(() => {
  delete window.fbq;
  delete window.gtag;
});

describe('trackPixel', () => {
  it('forwards event + params to window.fbq', () => {
    const fbq = vi.fn();
    window.fbq = fbq;
    trackPixel('Lead', { content_name: 'Tocador T-20' });
    expect(fbq).toHaveBeenCalledWith('track', 'Lead', { content_name: 'Tocador T-20' });
  });

  it('passes the event through with no params', () => {
    const fbq = vi.fn();
    window.fbq = fbq;
    trackPixel('PageView');
    expect(fbq).toHaveBeenCalledWith('track', 'PageView', undefined);
  });

  it('forwards fbq options (eventID) as a 4th arg when given', () => {
    const fbq = vi.fn();
    window.fbq = fbq;
    trackPixel('Lead', { content_name: 'X' }, { eventID: 'evt-1' });
    expect(fbq).toHaveBeenCalledWith('track', 'Lead', { content_name: 'X' }, { eventID: 'evt-1' });
  });

  it('is a no-op (does not throw) when fbq is absent', () => {
    delete window.fbq;
    expect(() => trackPixel('ViewContent', { content_ids: ['x'] })).not.toThrow();
  });
});

describe('trackGoogleAdsLead', () => {
  it('fires a conversion event with send_to, value and currency', () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    trackGoogleAdsLead();
    expect(gtag).toHaveBeenCalledWith('event', 'conversion', {
      send_to: `${GOOGLE_ADS_ID}/aTAPCI6368QcEP_r4_5D`,
      value: 1.0,
      currency: 'EUR',
    });
  });

  it('is a no-op (does not throw) when gtag is absent', () => {
    delete window.gtag;
    expect(() => trackGoogleAdsLead()).not.toThrow();
  });
});

describe('trackGa4Lead', () => {
  it('sends generate_lead to GA4 only, with value and currency', () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    trackGa4Lead({ value: 199 });
    expect(gtag).toHaveBeenCalledWith('event', 'generate_lead', {
      send_to: GA4_ID,
      currency: 'EUR',
      value: 199,
    });
  });

  it('omits value when the product has no price', () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    trackGa4Lead({ value: 0 });
    expect(gtag).toHaveBeenCalledWith('event', 'generate_lead', {
      send_to: GA4_ID,
      currency: 'EUR',
    });
  });

  it('is a no-op (does not throw) when gtag is absent', () => {
    delete window.gtag;
    expect(() => trackGa4Lead({ value: 199 })).not.toThrow();
  });
});

describe('buildUserData', () => {
  it('prepends the country code to a bare 9-digit Spanish number', () => {
    expect(buildUserData({ phone: '612 345 678' }).ph).toBe('34612345678');
  });

  it('keeps an already-prefixed number and strips +/spaces and leading 00', () => {
    expect(buildUserData({ phone: '+34 612 345 678' }).ph).toBe('34612345678');
    expect(buildUserData({ phone: '0034612345678' }).ph).toBe('34612345678');
  });

  it('splits the name into lower-cased fn / ln', () => {
    expect(buildUserData({ name: 'María García' })).toMatchObject({ fn: 'maría', ln: 'garcía' });
  });

  it('omits fields that are missing', () => {
    expect(buildUserData({ name: 'Ana' })).toEqual({ fn: 'ana' });
    expect(buildUserData({})).toEqual({});
  });
});

describe('setPixelUserData', () => {
  it('re-inits the pixel with the user data', () => {
    const fbq = vi.fn();
    window.fbq = fbq;
    setPixelUserData({ ph: '34612345678', fn: 'ana' });
    expect(fbq).toHaveBeenCalledWith('init', META_PIXEL_ID, { ph: '34612345678', fn: 'ana' });
  });

  it('does nothing for empty data', () => {
    const fbq = vi.fn();
    window.fbq = fbq;
    setPixelUserData({});
    expect(fbq).not.toHaveBeenCalled();
  });

  it('is a no-op (does not throw) when fbq is absent', () => {
    delete window.fbq;
    expect(() => setPixelUserData({ ph: '34612345678' })).not.toThrow();
  });
});
