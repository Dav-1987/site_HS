import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { buildLeadEvent } from './meta-capi.js';

const sha256 = (v) => createHash('sha256').update(v).digest('hex');

describe('buildLeadEvent', () => {
  it('hashes a normalized phone and split name', () => {
    const ev = buildLeadEvent({ name: 'Ana López', phone: '612 345 678' });
    expect(ev.user_data.ph).toEqual([sha256('34612345678')]);
    expect(ev.user_data.fn).toEqual([sha256('ana')]);
    expect(ev.user_data.ln).toEqual([sha256('lópez')]);
  });

  it('sets the standard Lead envelope fields', () => {
    const ev = buildLeadEvent({ name: 'Ana', phone: '612345678', eventId: 'abc-123', eventSourceUrl: 'https://hsmuebles.es/x' });
    expect(ev.event_name).toBe('Lead');
    expect(ev.action_source).toBe('website');
    expect(ev.event_id).toBe('abc-123');
    expect(ev.event_source_url).toBe('https://hsmuebles.es/x');
    expect(typeof ev.event_time).toBe('number');
  });

  it('passes through non-hashed match keys (ip, ua, fbp, fbc) raw', () => {
    const ev = buildLeadEvent({
      name: 'Ana', phone: '612345678',
      clientIp: '1.2.3.4', userAgent: 'UA', fbp: 'fb.1.2.3', fbc: 'fb.1.9.xyz',
    });
    expect(ev.user_data.client_ip_address).toBe('1.2.3.4');
    expect(ev.user_data.client_user_agent).toBe('UA');
    expect(ev.user_data.fbp).toBe('fb.1.2.3');
    expect(ev.user_data.fbc).toBe('fb.1.9.xyz');
  });

  it('builds custom_data from the product', () => {
    const ev = buildLeadEvent({ name: 'Ana', phone: '612345678', productName: 'Tocador', productId: 'T-20' });
    expect(ev.custom_data).toMatchObject({ content_type: 'product', content_name: 'Tocador', content_ids: ['T-20'] });
  });

  it('omits fields that are missing', () => {
    const ev = buildLeadEvent({ name: '', phone: '' });
    expect(ev.user_data.ph).toBeUndefined();
    expect(ev.user_data.fn).toBeUndefined();
    expect(ev.event_id).toBeUndefined();
  });
});
