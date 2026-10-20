import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import * as api from './api.js';
import { useOrders } from './useOrders.js';

vi.mock('./api.js', () => ({
  fetchOrders: vi.fn(),
  deleteOrder: vi.fn(),
  updateOrder: vi.fn(),
}));

const ORDERS = [
  { id: 1, name: 'Ana', status: 'new', note: '', statusChangedAt: null },
  { id: 2, name: 'Luis', status: 'called', note: '' },
];

beforeEach(() => {
  api.fetchOrders.mockResolvedValue({ orders: structuredClone(ORDERS) });
});

async function loaded() {
  const hook = renderHook(() => useOrders());
  await waitFor(() => expect(hook.result.current.orders).toHaveLength(2));
  return hook;
}

describe('useOrders — counting', () => {
  it('counts the orders nobody has called yet', async () => {
    const { result } = await loaded();
    expect(result.current.newCount).toBe(1);
  });
});

describe('useOrders — update', () => {
  it('shows a new status at once, before the server answers', async () => {
    let answer;
    api.updateOrder.mockReturnValue(new Promise((r) => (answer = r)));
    const { result } = await loaded();

    act(() => {
      result.current.update(result.current.orders[0], { status: 'called' });
    });
    expect(result.current.orders[0].status).toBe('called');
    expect(result.current.newCount).toBe(0);

    await act(async () =>
      answer({
        order: { ...ORDERS[0], status: 'called', statusChangedAt: '2026-10-20T12:00:00Z' },
      }),
    );
    expect(result.current.orders[0].statusChangedAt).toBe('2026-10-20T12:00:00Z');
  });

  it('takes the status back, and says why, when the server refuses', async () => {
    api.updateOrder.mockRejectedValue(new Error('Unknown order status'));
    const { result } = await loaded();

    let saved;
    await act(async () => {
      saved = await result.current.update(result.current.orders[0], { status: 'called' });
    });
    expect(saved).toBe(false);
    expect(result.current.orders[0].status).toBe('new');
    expect(result.current.error).toMatch(/Не удалось сохранить заявку от Ana/);
  });

  it('keeps a note typed while a status change was in flight', async () => {
    let answer;
    api.updateOrder.mockReturnValueOnce(new Promise((r) => (answer = r)));
    api.updateOrder.mockResolvedValueOnce({ order: { ...ORDERS[0], note: 'llamar a las 18' } });
    const { result } = await loaded();

    act(() => {
      result.current.update(result.current.orders[0], { status: 'called' });
    });
    await act(async () => {
      await result.current.update(result.current.orders[0], { note: 'llamar a las 18' });
    });
    // The status request answers last, with the note the server had then.
    await act(async () => answer({ order: { ...ORDERS[0], status: 'called', note: '' } }));

    expect(result.current.orders[0]).toMatchObject({ status: 'called', note: 'llamar a las 18' });
  });
});
