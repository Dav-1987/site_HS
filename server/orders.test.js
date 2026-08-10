import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.fn();

vi.mock('./db.js', () => ({
  default: { query },
}));

const { saveOrder } = await import('./orders.js');

const order = {
  eventId: 'event-123',
  name: 'Ana',
  phone: '+34 600 000 000',
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

  it('rejects when the durable INSERT fails', async () => {
    query.mockRejectedValueOnce(new Error('database unavailable'));

    await expect(saveOrder(order)).rejects.toThrow('database unavailable');
    expect(query).toHaveBeenCalledTimes(1);
  });
});
