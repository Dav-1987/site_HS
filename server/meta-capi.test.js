import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { buildLeadEvent } from './meta-capi.js';

const sha256 = (v) => createHash('sha256').update(v).digest('hex');

describe('buildLeadEvent', () => {
  it('hashes a normalized phone and split name', () => {
    const ev = buildLeadEvent({ name: 'Ana López', phone: '612 345 678', country: 'ES' });
    expect(ev.user_data.ph).toEqual([sha256('34612345678')]);
    expect(ev.user_data.fn).toEqual([sha256('ana')]);
    expect(ev.user_data.ln).toEqual([sha256('lópez')]);
  });

  it('sets the standard Lead envelope fields', () => {
    const ev = buildLeadEvent({
      name: 'Ana',
      phone: '612345678',
      country: 'ES',
      eventId: 'abc-123',
      eventSourceUrl: 'https://hsmuebles.es/x',
    });
    expect(ev.event_name).toBe('Lead');
    expect(ev.action_source).toBe('website');
    expect(ev.event_id).toBe('abc-123');
    expect(ev.event_source_url).toBe('https://hsmuebles.es/x');
    expect(typeof ev.event_time).toBe('number');
  });

  it('passes through non-hashed match keys (ip, ua, fbp, fbc) raw', () => {
    const ev = buildLeadEvent({
      name: 'Ana',
      phone: '612345678',
      country: 'ES',
      clientIp: '1.2.3.4',
      userAgent: 'UA',
      fbp: 'fb.1.2.3',
      fbc: 'fb.1.9.xyz',
    });
    expect(ev.user_data.client_ip_address).toBe('1.2.3.4');
    expect(ev.user_data.client_user_agent).toBe('UA');
    expect(ev.user_data.fbp).toBe('fb.1.2.3');
    expect(ev.user_data.fbc).toBe('fb.1.9.xyz');
  });

  it('builds custom_data from the product', () => {
    const ev = buildLeadEvent({
      name: 'Ana',
      phone: '612345678',
      country: 'ES',
      productName: 'Tocador',
      productId: 'T-20',
    });
    expect(ev.custom_data).toMatchObject({
      content_type: 'product',
      content_name: 'Tocador',
      content_ids: ['T-20'],
    });
  });

  it('carries the product value so it matches the browser Lead', () => {
    const ev = buildLeadEvent({ name: 'Ana', phone: '612345678', country: 'ES', value: 199 });
    expect(ev.custom_data).toMatchObject({ value: 199, currency: 'EUR' });
  });

  it('leaves value out when the product has no price', () => {
    const ev = buildLeadEvent({ name: 'Ana', phone: '612345678', country: 'ES', value: 0 });
    expect(ev.custom_data.value).toBeUndefined();
    expect(ev.custom_data.currency).toBeUndefined();
  });

  it('omits fields that are missing', () => {
    const ev = buildLeadEvent({ name: '', phone: '' });
    expect(ev.user_data.ph).toBeUndefined();
    expect(ev.user_data.fn).toBeUndefined();
    expect(ev.event_id).toBeUndefined();
  });

  it('hashes the real country, postal code and explicit international phone', () => {
    const ev = buildLeadEvent({
      name: 'Ana López',
      phone: '+374 99 123456',
      country: 'FR',
      postalCode: ' 75001 ',
    });

    expect(ev.user_data.ph).toEqual([sha256('37499123456')]);
    expect(ev.user_data.country).toEqual([sha256('fr')]);
    expect(ev.user_data.zp).toEqual([sha256('75001')]);
  });

  it('normalizes a Portuguese national phone with PT rather than adding +34', () => {
    const ev = buildLeadEvent({ phone: '912 345 678', country: 'PT', postalCode: '1000-001' });
    expect(ev.user_data.ph).toEqual([sha256('351912345678')]);
    expect(ev.user_data.country).toEqual([sha256('pt')]);
    expect(ev.user_data.zp).toEqual([sha256('1000-001')]);
  });
});
