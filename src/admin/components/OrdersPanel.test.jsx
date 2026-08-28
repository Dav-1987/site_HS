import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import OrdersPanel from './OrdersPanel.jsx';

afterEach(() => vi.unstubAllGlobals());

function order(overrides = {}) {
  return {
    id: 1,
    createdAt: '2026-08-28T10:00:00.000Z',
    name: 'Ana',
    phone: '+37499123456',
    country: 'FR',
    postalCode: '75001',
    address: 'Paris',
    comment: '',
    productId: 'p1',
    productName: 'Tocador Aria',
    price: 450,
    attributionLabel: 'Directo / desconocido',
    telegramSent: true,
    emailSent: false,
    ...overrides,
  };
}

function mockOrders(orders) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ orders }) })),
  );
}

describe('OrdersPanel delivery country', () => {
  it('shows the localized country and ISO code for a new order', async () => {
    mockOrders([order()]);
    render(<OrdersPanel onClose={() => {}} />);

    await waitFor(() => expect(screen.getByText('Страна: Франция (FR)')).toBeTruthy());
    expect(screen.getByText('+37499123456')).toBeTruthy();
  });

  it('keeps the country unknown for a legacy order', async () => {
    mockOrders([order({ id: 2, country: null, name: 'Legacy' })]);
    render(<OrdersPanel onClose={() => {}} />);

    await waitFor(() => expect(screen.getByText('Страна: неизвестна')).toBeTruthy());
  });
});
