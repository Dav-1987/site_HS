import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createOrderHandler } from './order-handler.js';

const validBody = {
  name: 'Marie Dupont',
  phone: '+374 99 123456',
  country: 'FR',
  postalCode: '75001',
  productId: 'p1',
  eventId: 'event-123',
  fbp: 'fb.1.2.3',
  fbc: 'fb.1.9.xyz',
  eventSourceUrl: 'https://hsmuebles.es/product/p1',
};

function response() {
  return {
    statusCode: 200,
    body: null,
    status: vi.fn(function setStatus(code) {
      this.statusCode = code;
      return this;
    }),
    json: vi.fn(function sendJson(body) {
      this.body = body;
      return this;
    }),
  };
}

function request(body = validBody) {
  return {
    body,
    ip: '1.2.3.4',
    get: vi.fn(() => 'Test UA'),
  };
}

function dependencies(overrides = {}) {
  return {
    readOrSeedCatalog: vi.fn(async () => [
      { slug: 'tocadores', products: [{ id: 'p1', name: 'Tocador Aria', price: 450 }] },
    ]),
    saveOrder: vi.fn(async () => ({ id: 41, created: true })),
    telegramConfigured: vi.fn(() => true),
    emailConfigured: vi.fn(() => false),
    sendTelegram: vi.fn(async () => {}),
    sendOrderEmail: vi.fn(async () => {}),
    markOrderTelegramSent: vi.fn(async () => {}),
    markOrderEmailSent: vi.fn(async () => {}),
    metaCapiConfigured: vi.fn(() => true),
    sendLeadEvent: vi.fn(async () => {}),
    ...overrides,
  };
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe('public order handler', () => {
  it('rejects a new order without a delivery country', async () => {
    const deps = dependencies();
    const handler = createOrderHandler(deps);
    const res = response();

    await handler(request({ ...validBody, country: undefined }), res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'country is required' });
    expect(deps.saveOrder).not.toHaveBeenCalled();
  });

  it('stores canonical country, postcode and E.164 phone before sending events', async () => {
    const deps = dependencies();
    const handler = createOrderHandler(deps);
    const req = request({ ...validBody, postalCode: ' 75001 ' });
    const res = response();

    await handler(req, res);
    await Promise.resolve();

    expect(res.body).toEqual({ ok: true });
    expect(deps.saveOrder).toHaveBeenCalledWith(
      expect.objectContaining({ country: 'FR', phone: '+37499123456', postalCode: '75001' }),
    );
    expect(deps.sendLeadEvent).toHaveBeenCalledTimes(1);
    expect(deps.sendLeadEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        country: 'FR',
        phone: '+37499123456',
        postalCode: '75001',
        eventId: 'event-123',
      }),
    );
    expect(deps.sendTelegram).toHaveBeenCalledWith(expect.stringContaining('País: Francia (FR)'));
  });

  it('does not send a second Lead or notification for a repeated event id', async () => {
    const deps = dependencies({ saveOrder: vi.fn(async () => ({ id: 41, created: false })) });
    const handler = createOrderHandler(deps);
    const res = response();

    await handler(request(), res);

    expect(res.body).toEqual({ ok: true });
    expect(deps.sendLeadEvent).not.toHaveBeenCalled();
    expect(deps.sendTelegram).not.toHaveBeenCalled();
    expect(deps.sendOrderEmail).not.toHaveBeenCalled();
  });
});
