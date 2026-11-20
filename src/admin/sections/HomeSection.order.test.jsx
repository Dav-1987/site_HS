import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as api from '../api.js';
import AdminRoutes from '../AdminRoutes.jsx';

vi.mock('../api.js', () => ({
  fetchCatalog: vi.fn(),
  saveCatalog: vi.fn(),
  fetchSettings: vi.fn(),
  saveSettings: vi.fn(),
  fetchOrders: vi.fn(),
  fetchRebuildStatus: vi.fn(),
  listVersions: vi.fn(),
}));

const categories = [
  {
    slug: 'one',
    name: { es: 'Uno', en: 'One' },
    products: [{ id: 'A', name: 'Espejo A', reference: 'A', onHomeCatalog: true }],
  },
  {
    slug: 'two',
    name: { es: 'Dos', en: 'Two' },
    visibility: 'off',
    products: [{ id: 'B', name: 'Espejo B', reference: 'B', onHomeCatalog: true }],
  },
];

beforeEach(() => {
  localStorage.clear();
  api.fetchCatalog.mockResolvedValue({ categories: structuredClone(categories) });
  api.fetchSettings.mockResolvedValue({ settings: {} });
  api.fetchOrders.mockResolvedValue({ orders: [] });
  api.fetchRebuildStatus.mockResolvedValue({ configured: false });
  api.saveSettings.mockImplementation(async (settings) => ({ settings, revision: 'saved' }));
});

describe('home catalog order in the admin', () => {
  it('moves a selected product from a hidden category and saves the new order', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/home']}>
        <Routes>
          <Route path="/admin/*" element={<AdminRoutes onLogout={() => {}} />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole('button', { name: /Каталог на главной/ }));
    const list = screen.getByRole('list', { name: 'Порядок товаров каталога на главной' });
    expect(within(list).getAllByRole('listitem')[0].textContent).toContain('Espejo A');

    fireEvent.click(screen.getByRole('button', { name: 'Поднять B' }));
    expect(within(list).getAllByRole('listitem')[0].textContent).toContain('Espejo B');
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() => expect(api.saveSettings).toHaveBeenCalled());
    expect(api.saveSettings.mock.calls.at(-1)[0].homeCatalogOrder).toEqual(['B', 'A']);
    expect(api.saveCatalog).not.toHaveBeenCalled();
  });
});

describe('home navigation in the admin', () => {
  it('saves catalog and contact scroll switches independently', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/home']}>
        <Routes>
          <Route path="/admin/*" element={<AdminRoutes onLogout={() => {}} />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole('button', { name: /Навигация на главной/ }));
    const catalogSwitch = screen.getByLabelText(/«Каталог» — прокрутка/);
    const contactsSwitch = screen.getByLabelText(/«Контакты» — прокрутка/);
    expect(catalogSwitch.checked).toBe(false);
    expect(contactsSwitch.checked).toBe(false);
    fireEvent.click(catalogSwitch);
    fireEvent.click(contactsSwitch);
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() => expect(api.saveSettings).toHaveBeenCalled());
    expect(api.saveSettings.mock.calls.at(-1)[0].homeNavigation).toEqual({
      catalogScroll: true,
      contactsScroll: true,
    });
  });
});
