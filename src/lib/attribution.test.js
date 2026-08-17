import { describe, it, expect } from 'vitest';
import { captureAttribution, getAttribution, readAttribution } from './attribution.js';

function memoryStorage(initial) {
  const map = new Map(initial ? [['hs-attribution', JSON.stringify(initial)]] : []);
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
    read: () => JSON.parse(map.get('hs-attribution')),
  };
}

const SITE = 'https://hsmuebles.es';

describe('readAttribution', () => {
  it('recognizes a Google Ads click', () => {
    const snap = readAttribution({ url: `${SITE}/tocadores?gclid=abc123`, referrer: '' });
    expect(snap).toMatchObject({ network: 'google_ads', clickId: 'abc123', clickIdParam: 'gclid' });
  });

  it('recognizes a Meta click and its utm parameters', () => {
    const snap = readAttribution({
      url: `${SITE}/?fbclid=xyz&utm_source=ig&utm_medium=paid&utm_campaign=agosto`,
      referrer: 'https://l.instagram.com/',
    });
    expect(snap).toMatchObject({
      network: 'meta_ads',
      utm_source: 'ig',
      utm_medium: 'paid',
      utm_campaign: 'agosto',
      referrer: 'https://l.instagram.com/',
    });
  });

  it('ignores a same-site referrer', () => {
    const snap = readAttribution({ url: `${SITE}/tocadores`, referrer: `${SITE}/` });
    expect(snap.referrer).toBeUndefined();
  });

  it('records the landing path', () => {
    expect(readAttribution({ url: `${SITE}/espejos/E-01?x=1`, referrer: '' }).landing).toBe(
      '/espejos/E-01',
    );
  });

  it('caps hostile parameter lengths', () => {
    const snap = readAttribution({
      url: `${SITE}/?utm_campaign=${'x'.repeat(500)}`,
      referrer: '',
    });
    expect(snap.utm_campaign).toHaveLength(200);
  });
});

describe('captureAttribution', () => {
  it('stores the first visit', () => {
    const storage = memoryStorage();
    captureAttribution({ storage, url: `${SITE}/?gclid=abc`, referrer: '' });
    expect(storage.read()).toMatchObject({ network: 'google_ads' });
  });

  it('keeps the stored source when a later visit carries no campaign markers', () => {
    const storage = memoryStorage({ ts: Date.now(), network: 'meta_ads' });
    const result = captureAttribution({
      storage,
      url: `${SITE}/tocadores`,
      referrer: 'https://www.google.com/',
    });
    expect(result.network).toBe('meta_ads');
    expect(storage.read().network).toBe('meta_ads');
  });

  it('lets a fresh ad click win over the older source', () => {
    const storage = memoryStorage({ ts: Date.now(), referrer: 'https://www.google.com/' });
    captureAttribution({ storage, url: `${SITE}/?fbclid=new`, referrer: '' });
    expect(storage.read()).toMatchObject({ network: 'meta_ads', clickId: 'new' });
  });

  it('drops a snapshot older than the retention window', () => {
    const storage = memoryStorage({
      ts: Date.now() - 91 * 24 * 60 * 60 * 1000,
      network: 'meta_ads',
    });
    const result = captureAttribution({ storage, url: `${SITE}/tocadores`, referrer: '' });
    expect(result.network).toBeUndefined();
    expect(getAttribution(storage).network).toBeUndefined();
  });

  it('survives unusable storage', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(() => captureAttribution({ storage: broken, url: `${SITE}/`, referrer: '' })).not.toThrow();
    expect(getAttribution(broken)).toBeNull();
  });
});

describe('getAttribution', () => {
  it('returns null when nothing was stored', () => {
    expect(getAttribution(memoryStorage())).toBeNull();
  });

  it('returns null on corrupted storage', () => {
    const storage = { getItem: () => '{not json', setItem: () => {} };
    expect(getAttribution(storage)).toBeNull();
  });
});
