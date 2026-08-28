import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.fn();

vi.mock('./db.js', () => ({
  default: { query },
}));

const { listOrders, saveOrder } = await import('./orders.js');

const order = {
  eventId: 'event-123',
  name: 'Ana',
  phone: '+34 600 000 000',
  country: 'ES',
  postalCode: '28001',
  address: '',
  comment: '',
  productId: 'p1',
  productName: 'Tocador Aria',
  price: 450,
};

describe('saveOrder idempotency', () => {
  beforeEach(() => query.mockReset());

  it('returns a newly inserted durable order', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 41 }] });

    await expect(saveOrder(order)).resolves.toEqual({ id: 41, created: true });
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain('ON CONFLICT (event_id)');
    expect(query.mock.calls[0][1][3]).toBe('ES');
  });

  it('resolves a repeated event id to the original order', async () => {
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ id: 41 }] });

    await expect(saveOrder(order)).resolves.toEqual({ id: 41, created: false });
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1]).toEqual([
      'SELECT id FROM orders WHERE event_id = $1',
      ['event-123'],
    ]);
  });

  it('stores the attribution snapshot as sanitized JSON', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 42 }] });

    await saveOrder({
      ...order,
      attribution: { utm_source: 'ig', utm_campaign: 'agosto', evil: 'DROP TABLE orders' },
    });

    const params = query.mock.calls[0][1];
    expect(JSON.parse(params[params.length - 1])).toEqual({
      utm_source: 'ig',
      utm_campaign: 'agosto',
    });
  });

  it('stores NULL when the order carries no usable attribution', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 43 }] });

    await saveOrder(order);

    const params = query.mock.calls[0][1];
    expect(params[params.length - 1]).toBeNull();
  });

  it('rejects when the durable INSERT fails', async () => {
    query.mockRejectedValueOnce(new Error('database unavailable'));

    await expect(saveOrder(order)).rejects.toThrow('database unavailable');
    expect(query).toHaveBeenCalledTimes(1);
  });
});

describe('listOrders country compatibility', () => {
  beforeEach(() => query.mockReset());

  it('returns the stored delivery country for new orders', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: '41',
          created_at: '2026-08-28T10:00:00.000Z',
          name: 'Ana',
          phone: '+37499123456',
          country: 'FR',
          postal_code: '75001',
          address: '',
          comment: '',
          product_id: 'p1',
          product_name: 'Tocador Aria',
          price: 450,
          attribution: null,
          telegram_sent: true,
          email_sent: false,
        },
      ],
    });

    await expect(listOrders()).resolves.toMatchObject([
      { id: 41, country: 'FR', phone: '+37499123456', postalCode: '75001' },
    ]);
  });

  it('keeps the country unknown for legacy rows', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: '7',
          created_at: '2026-07-01T10:00:00.000Z',
          name: 'Legacy',
          phone: '600000000',
          country: null,
          postal_code: '',
          address: '',
          comment: '',
          product_id: '',
          product_name: '',
          price: null,
          attribution: null,
          telegram_sent: false,
          email_sent: false,
        },
      ],
    });

    await expect(listOrders()).resolves.toMatchObject([{ id: 7, country: null }]);
  });
});
