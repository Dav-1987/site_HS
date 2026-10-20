import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.fn();

vi.mock('./db.js', () => ({
  default: { query },
}));

const { MAX_ORDER_NOTE_LENGTH, listOrders, parseOrderPatch, saveOrder, updateOrder } =
  await import('./orders.js');

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

// Positions in the INSERT parameter list ($11 and $12).
const ATTRIBUTION_PARAM = 10;
const USER_AGENT_PARAM = 11;

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

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
    expect(JSON.parse(params[ATTRIBUTION_PARAM])).toEqual({
      utm_source: 'ig',
      utm_campaign: 'agosto',
    });
  });

  it('stores NULL when the order carries no usable attribution', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 43 }] });

    await saveOrder(order);

    const params = query.mock.calls[0][1];
    expect(params[ATTRIBUTION_PARAM]).toBeNull();
  });

  it('stores the raw user agent, trimmed and capped', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 44 }] });

    await saveOrder({ ...order, userAgent: `  ${IPHONE_UA}  ` });
    expect(query.mock.calls[0][0]).toContain('user_agent');
    expect(query.mock.calls[0][1][USER_AGENT_PARAM]).toBe(IPHONE_UA);

    query.mockResolvedValueOnce({ rows: [{ id: 45 }] });
    await saveOrder({ ...order, userAgent: 'x'.repeat(5000) });
    expect(query.mock.calls[1][1][USER_AGENT_PARAM]).toHaveLength(1000);
  });

  it('stores NULL when the request carried no user agent', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 46 }] });

    await saveOrder(order);

    expect(query.mock.calls[0][1][USER_AGENT_PARAM]).toBeNull();
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

describe('listOrders device', () => {
  beforeEach(() => query.mockReset());

  const row = (userAgent) => ({
    id: '50',
    created_at: '2026-09-10T10:00:00.000Z',
    name: 'Ana',
    phone: '+34600000000',
    country: 'ES',
    postal_code: '28001',
    address: '',
    comment: '',
    product_id: 'p1',
    product_name: 'Tocador Aria',
    price: 450,
    attribution: null,
    user_agent: userAgent,
    telegram_sent: true,
    email_sent: true,
  });

  it('derives the same device label the notification carries', async () => {
    query.mockResolvedValueOnce({ rows: [row(IPHONE_UA)] });

    await expect(listOrders()).resolves.toMatchObject([{ device: '📱 iPhone · Safari' }]);
    expect(query.mock.calls[0][0]).toContain('user_agent');
  });

  it('has no device for orders saved before the user agent was stored', async () => {
    query.mockResolvedValueOnce({ rows: [row(null)] });

    await expect(listOrders()).resolves.toMatchObject([{ device: '' }]);
  });
});

const statusRow = (overrides) => ({
  id: '60',
  created_at: '2026-10-20T10:00:00.000Z',
  name: 'Ana',
  phone: '+34600000000',
  country: 'ES',
  postal_code: '28001',
  address: '',
  comment: '',
  product_id: 'p1',
  product_name: 'Tocador Aria',
  price: 450,
  attribution: null,
  user_agent: null,
  telegram_sent: true,
  email_sent: true,
  status: 'new',
  status_changed_at: null,
  note: '',
  ...overrides,
});

describe('listOrders status', () => {
  beforeEach(() => query.mockReset());

  it('returns the status, when it changed and the note', async () => {
    query.mockResolvedValueOnce({
      rows: [
        statusRow({
          status: 'called',
          status_changed_at: '2026-10-20T11:30:00.000Z',
          note: 'перезвонить после 18:00',
        }),
      ],
    });

    await expect(listOrders()).resolves.toMatchObject([
      {
        status: 'called',
        statusChangedAt: '2026-10-20T11:30:00.000Z',
        note: 'перезвонить после 18:00',
      },
    ]);
    expect(query.mock.calls[0][0]).toContain('status_changed_at');
  });

  it('keeps orders saved before statuses existed without one', async () => {
    query.mockResolvedValueOnce({ rows: [statusRow({ status: null })] });

    await expect(listOrders()).resolves.toMatchObject([
      { status: null, statusChangedAt: null, note: '' },
    ]);
  });
});

describe('parseOrderPatch', () => {
  it('accepts a status, a note, or both', () => {
    expect(parseOrderPatch({ status: 'called' })).toEqual({ patch: { status: 'called' } });
    expect(parseOrderPatch({ note: 'доставка 22.10' })).toEqual({
      patch: { note: 'доставка 22.10' },
    });
    expect(parseOrderPatch({ status: 'confirmed', note: '' })).toEqual({
      patch: { status: 'confirmed', note: '' },
    });
  });

  it('ignores the customer fields, which are not editable', () => {
    expect(parseOrderPatch({ status: 'refused', phone: '+34 911 111 111' })).toEqual({
      patch: { status: 'refused' },
    });
    expect(parseOrderPatch({ name: 'Otro' })).toEqual({ error: 'Nothing to update' });
  });

  it('rejects a status outside the workflow', () => {
    for (const status of ['done', 'NEW', '', null, 3]) {
      expect(parseOrderPatch({ status })).toEqual({ error: 'Unknown order status' });
    }
  });

  it('rejects a note that is not text or is too long', () => {
    expect(parseOrderPatch({ note: 42 })).toEqual({ error: 'Note must be a string' });
    expect(parseOrderPatch({ note: 'x'.repeat(MAX_ORDER_NOTE_LENGTH) })).toEqual({
      patch: { note: 'x'.repeat(MAX_ORDER_NOTE_LENGTH) },
    });
    expect(parseOrderPatch({ note: 'x'.repeat(MAX_ORDER_NOTE_LENGTH + 1) }).error).toMatch(
      /longer than/,
    );
  });

  it('rejects a body that is not an object', () => {
    for (const body of [undefined, null, 'called', ['called']]) {
      expect(parseOrderPatch(body)).toEqual({ error: 'Expected a JSON object' });
    }
    expect(parseOrderPatch({})).toEqual({ error: 'Nothing to update' });
  });
});

describe('updateOrder', () => {
  beforeEach(() => query.mockReset());

  it('sets the status and returns the order as /admin lists it', async () => {
    query.mockResolvedValueOnce({
      rows: [statusRow({ status: 'called', status_changed_at: '2026-10-20T12:00:00.000Z' })],
    });

    await expect(updateOrder(60, { status: 'called' })).resolves.toMatchObject({
      id: 60,
      status: 'called',
      statusChangedAt: '2026-10-20T12:00:00.000Z',
    });
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('UPDATE orders SET');
    expect(params).toEqual([60, 'called', null]);
  });

  it('moves the status time only when the status really changes', async () => {
    query.mockResolvedValueOnce({ rows: [statusRow()] });

    await updateOrder(60, { note: 'llamar mañana' });

    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/IS DISTINCT FROM status THEN NOW\(\)/);
    expect(sql).toContain('ELSE status_changed_at');
    // A note-only edit leaves the status (and so its time) as it is.
    expect(params).toEqual([60, null, 'llamar mañana']);
  });

  it('returns null when no order has this id', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await expect(updateOrder(999, { status: 'called' })).resolves.toBeNull();
  });
});
