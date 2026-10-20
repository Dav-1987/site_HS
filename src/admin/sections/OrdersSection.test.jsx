import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as api from '../api.js';
import AdminRoutes from '../AdminRoutes.jsx';

// The orders section end to end — routes, shell, useOrders — with only the
// network mocked.
vi.mock('../api.js', () => ({
  fetchCatalog: vi.fn(),
  fetchSettings: vi.fn(),
  fetchOrders: vi.fn(),
  updateOrder: vi.fn(),
  deleteOrder: vi.fn(),
  fetchRebuildStatus: vi.fn(),
}));

const order = (id, name, status, extra = {}) => ({
  id,
  name,
  status,
  createdAt: new Date().toISOString(),
  phone: `+3460000000${id}`,
  country: 'ES',
  productName: 'Tocador Aria',
  productId: 'Tocador-A',
  price: 450,
  attributionLabel: 'Directo / desconocido',
  telegramSent: true,
  emailSent: true,
  note: '',
  ...extra,
});

const ORDERS = [
  order(1, 'Ana', 'new'),
  order(2, 'Bea', 'new'),
  order(3, 'Carla', 'called'),
  order(4, 'Dora', 'confirmed'),
  order(5, 'Eva', 'delivered'),
];

beforeEach(() => {
  localStorage.clear();
  api.fetchCatalog.mockResolvedValue({ categories: [] });
  api.fetchSettings.mockResolvedValue({ settings: {} });
  api.fetchRebuildStatus.mockResolvedValue({ configured: false });
  api.fetchOrders.mockResolvedValue({ orders: structuredClone(ORDERS) });
  api.updateOrder.mockImplementation(async (id, patch) => ({
    order: { ...ORDERS.find((o) => o.id === id), ...patch },
  }));
});

async function openOrders(search = '') {
  render(
    <MemoryRouter initialEntries={[`/admin/orders${search}`]}>
      <Routes>
        <Route path="/admin/*" element={<AdminRoutes onLogout={() => {}} />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('group', { name: 'Статус заявок' });
}

const tab = (name) => screen.getByRole('button', { name: new RegExp(`^${name} \\d`) });
const names = () =>
  screen
    .queryAllByRole('article')
    .map((a) => a.getAttribute('aria-label').replace('Заявка от ', ''));
const navLink = () =>
  within(screen.getByRole('navigation', { name: 'Разделы админки' })).getByRole('link', {
    name: /Заявки/,
  });

describe('OrdersSection', () => {
  it('opens on the orders still in work, by stage', async () => {
    await openOrders();
    expect(tab('В работе').getAttribute('aria-pressed')).toBe('true');
    expect(tab('В работе').textContent).toBe('В работе 4');
    expect(screen.getByRole('heading', { name: 'Новые — ждут звонка 2' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Позвонили — ждут решения 1' })).toBeTruthy();
    expect(names()).toEqual(['Ana', 'Bea', 'Carla', 'Dora']);
  });

  it('switches to a status, with the address following', async () => {
    await openOrders();
    fireEvent.click(tab('Доставлены'));
    expect(names()).toEqual(['Eva']);
  });

  it('opens the tab its address names', async () => {
    await openOrders('?view=all');
    expect(names()).toHaveLength(5);
  });

  it('only has an «Без статуса» tab when some order has none', async () => {
    await openOrders();
    expect(screen.queryByRole('button', { name: /^Без статуса/ })).toBeNull();
  });

  it('finds an order by phone', async () => {
    await openOrders();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Поиск по заявкам' }), {
      target: { value: '600 000 0003' },
    });
    expect(names()).toEqual(['Carla']);
  });

  it('moves an order on, and the sidebar counts one less to call', async () => {
    await openOrders();
    expect(navLink().textContent).toBe('Заявки 2 новые');

    fireEvent.change(screen.getByRole('combobox', { name: 'Статус заявки от Ana' }), {
      target: { value: 'called' },
    });

    expect(api.updateOrder).toHaveBeenCalledWith(1, { status: 'called' });
    expect(navLink().textContent).toBe('Заявки 1 новая');
    expect(screen.getByRole('heading', { name: 'Позвонили — ждут решения 2' })).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('says when everything is done', async () => {
    api.fetchOrders.mockResolvedValue({ orders: [order(5, 'Eva', 'delivered')] });
    await openOrders();
    expect(screen.getByText('Все заявки обработаны: новых и незавершённых нет.')).toBeTruthy();
  });

  it('lists the orders from before statuses under their own tab', async () => {
    api.fetchOrders.mockResolvedValue({ orders: [order(9, 'Old', null)] });
    await openOrders();
    fireEvent.click(tab('Без статуса'));
    expect(names()).toEqual(['Old']);
  });
});
