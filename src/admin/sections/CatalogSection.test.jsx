import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import * as api from '../api.js';
import AdminRoutes from '../AdminRoutes.jsx';

// The catalog section end to end — routes, shell, the real useCatalogEditor —
// with only the network mocked.
vi.mock('../api.js', () => ({
  fetchCatalog: vi.fn(),
  saveCatalog: vi.fn(),
  fetchSettings: vi.fn(),
  saveSettings: vi.fn(),
  fetchOrders: vi.fn(),
  fetchRebuildStatus: vi.fn(),
  listVersions: vi.fn(),
}));

const product = (id, extra = {}) => ({
  id,
  name: `${id} name`,
  reference: id,
  price: 400,
  oldPrice: 500,
  media: [
    { type: 'image', src: `/uploads/${id}-1.jpg` },
    { type: 'image', src: `/uploads/${id}-2.jpg` },
  ],
  ...extra,
});

const CATALOG = [
  {
    slug: 'tocadores',
    name: { es: 'Tocadores' },
    products: [
      product('L-06', { name: 'Tocador Doble Cajonera' }),
      product('T-09', { name: 'Tocador Compacto', visibility: 'unlisted' }),
    ],
  },
  {
    slug: 'estanterias',
    name: { es: 'Estanterías' },
    visibility: 'unlisted',
    products: [product('E-01', { name: 'Estantería Roble', inStock: false })],
  },
  { slug: 'vacia', name: { es: 'Vacía' }, products: [] },
];

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  api.fetchCatalog.mockResolvedValue({ categories: structuredClone(CATALOG) });
  api.fetchSettings.mockResolvedValue({ settings: {} });
  api.fetchOrders.mockResolvedValue({ orders: [] });
  api.fetchRebuildStatus.mockResolvedValue({ configured: false });
  api.saveCatalog.mockImplementation(async (categories) => ({ categories }));
});

let location;
function Probe() {
  location = useLocation();
  return null;
}

async function openCatalog(search = '') {
  render(
    <MemoryRouter initialEntries={[`/admin/catalog${search}`]}>
      <Routes>
        <Route
          path="/admin/*"
          element={
            <>
              <AdminRoutes onLogout={() => {}} />
              <Probe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('group', { name: 'Категория' });
}

const tab = (name) => screen.getByRole('button', { name: new RegExp(`^${name}`) });
const listed = () =>
  screen.queryAllByRole('link', { name: /name$|Tocador|Estantería/ }).map((a) => a.textContent);
// The list's own heading (an open panel has one too).
const heading = () => document.getElementById('catalog-list-heading').textContent;

describe('CatalogSection — what is listed', () => {
  it('opens on the first category', async () => {
    await openCatalog();
    expect(tab('Tocadores').getAttribute('aria-pressed')).toBe('true');
    expect(heading()).toBe('Tocadores');
    expect(screen.getByText(/2 товара · показывается на сайте/)).toBeTruthy();
    expect(listed()).toEqual(['Tocador Doble Cajonera', 'Tocador Compacto']);
  });

  it('switches category, and lists every product under «Все»', async () => {
    await openCatalog();
    fireEvent.click(tab('Estanterías'));
    expect(listed()).toEqual(['Estantería Roble']);
    fireEvent.click(tab('Все'));
    expect(heading()).toBe('Все товары');
    expect(screen.getByText('3 товара в 3 категориях')).toBeTruthy();
    expect(listed()).toHaveLength(3);
  });

  it('marks a hidden category on its tab', async () => {
    await openCatalog();
    expect(within(tab('Estanterías')).getByRole('img', { name: 'скрыта из списков' })).toBeTruthy();
  });

  it('opens the category the address names', async () => {
    await openCatalog('?cat=estanterias');
    expect(heading()).toBe('Estanterías');
  });

  it('searches the whole catalog, whichever category is open', async () => {
    await openCatalog();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Поиск по товарам' }), {
      target: { value: 'roble' },
    });
    expect(heading()).toBe('Поиск: «roble»');
    expect(listed()).toEqual(['Estantería Roble']);
    expect(location.search).toBe('?q=roble');

    fireEvent.click(screen.getByRole('button', { name: 'Сбросить поиск' }));
    expect(heading()).toBe('Tocadores');
  });

  it('filters, with the count each filter would leave', async () => {
    await openCatalog();
    const hidden = screen.getByRole('checkbox', { name: 'Скрытые 1' });
    fireEvent.click(hidden);
    expect(listed()).toEqual(['Tocador Compacto']);
    expect(location.search).toBe('?f=hidden');
  });

  it('says so when nothing matches, and offers a way back', async () => {
    await openCatalog('?q=nogal');
    expect(screen.getByText('Ничего не нашлось.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить поиск и фильтры' }));
    expect(listed()).toHaveLength(2);
  });

  it('offers to add the first product to an empty category', async () => {
    await openCatalog('?cat=vacia');
    expect(screen.getByText('В этой категории пока нет товаров.')).toBeTruthy();
  });

  it('only offers to reorder where the rows are the order', async () => {
    await openCatalog();
    expect(screen.getByText(/Порядок строк — это порядок на сайте/)).toBeTruthy();
    fireEvent.click(tab('Все'));
    expect(screen.getByText(/Порядок меняется в списке одной категории/)).toBeTruthy();
  });
});

describe('CatalogSection — the product panel', () => {
  it('opens a product from its row, and Back closes it', async () => {
    await openCatalog();
    fireEvent.click(screen.getByRole('link', { name: 'Tocador Doble Cajonera' }));
    expect(screen.getByRole('dialog', { name: 'Tocador Doble Cajonera' })).toBeTruthy();
    expect(location.search).toBe('?product=L-06');

    fireEvent.click(screen.getByRole('button', { name: 'Закрыть товар' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(location.search).toBe('');
  });

  it('opens the product the address names, even in another category', async () => {
    await openCatalog('?product=E-01');
    expect(screen.getByRole('dialog', { name: 'Estantería Roble' })).toBeTruthy();
  });

  it('steps to the next product in the list', async () => {
    await openCatalog('?product=L-06');
    fireEvent.click(screen.getByRole('link', { name: 'Следующий товар: T-09' }));
    expect(screen.getByRole('dialog', { name: 'Tocador Compacto' })).toBeTruthy();
  });

  it('opens a new product to fill in', async () => {
    await openCatalog();
    fireEvent.click(screen.getAllByRole('button', { name: '+ Добавить товар' })[0]);
    expect(screen.getByRole('dialog', { name: 'Новый товар' })).toBeTruthy();
    // …and in the list, at the end of its category.
    expect(screen.getByRole('link', { name: 'Новый товар' })).toBeTruthy();
    expect(listed()).toHaveLength(2);
  });

  it('follows a renamed product in the address', async () => {
    await openCatalog('?product=L-06');
    fireEvent.click(screen.getByRole('button', { name: 'Изменить…' }));
    fireEvent.change(screen.getByLabelText('Адрес страницы (ID)'), {
      target: { value: 'Tocador-L-06' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Применить' }));
    expect(location.search).toBe('?product=Tocador-L-06');
    expect(screen.getByRole('dialog', { name: 'Tocador Doble Cajonera' })).toBeTruthy();
  });

  it('closes when its product is deleted', async () => {
    await openCatalog('?product=L-06');
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Удалить товар' }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(listed()).toEqual(['Tocador Compacto']);
  });
});

describe('CatalogSection — categories', () => {
  it('opens a new category’s settings', async () => {
    await openCatalog();
    fireEvent.click(screen.getByRole('button', { name: '+ Категория' }));
    expect(screen.getByRole('dialog', { name: 'Nueva categoría' })).toBeTruthy();
    expect(tab('Nueva categoría').getAttribute('aria-pressed')).toBe('true');
  });

  it('refuses an address a page of the site already has', async () => {
    await openCatalog();
    fireEvent.click(screen.getByRole('button', { name: 'Настройки категории' }));
    fireEvent.click(screen.getByRole('button', { name: 'Изменить…' }));
    fireEvent.change(screen.getByLabelText('Адрес категории'), { target: { value: 'Envios' } });
    expect(screen.getByRole('alert').textContent).toBe(
      'Этот адрес занят системной страницей сайта',
    );
  });

  it('moves the selected products to another category', async () => {
    await openCatalog();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Выбрать T-09' }));
    expect(screen.getByText('Выбрано: 1')).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox', { name: 'Переместить в категорию' }), {
      target: { value: 'vacia' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Переместить' }));
    expect(listed()).toEqual(['Tocador Doble Cajonera']);
    fireEvent.click(tab('Vacía'));
    expect(listed()).toEqual(['Tocador Compacto']);
  });

  const selectBoth = () => {
    fireEvent.click(screen.getByRole('checkbox', { name: 'Выбрать L-06' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Выбрать T-09' }));
  };
  const pick = (name, value) =>
    fireEvent.change(screen.getByRole('combobox', { name }), { target: { value } });

  it('sets the visibility of every selected product and keeps the selection', async () => {
    await openCatalog();
    selectBoth();
    pick('Видимость выбранных', 'off');
    expect(screen.getAllByText('снят с сайта')).toHaveLength(2);
    // Ready for the next action on the same products.
    expect(screen.getByText('Выбрано: 2')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Видимость выбранных' }).value).toBe('');
  });

  it('takes every selected product out of stock and puts it back', async () => {
    await openCatalog();
    selectBoth();
    const inStock = () => screen.getAllByRole('switch').map((s) => s.checked);
    expect(inStock()).toEqual([true, true]);
    pick('Наличие выбранных', 'out');
    expect(inStock()).toEqual([false, false]);
    pick('Наличие выбранных', 'in');
    expect(inStock()).toEqual([true, true]);
  });

  it('deletes the selected products once confirmed, saying what deleting costs', async () => {
    await openCatalog();
    selectBoth();
    fireEvent.click(screen.getByRole('button', { name: 'Удалить выбранные' }));
    const question = window.confirm.mock.calls.at(-1)[0];
    expect(question).toMatch(/^Удалить 2 товара\?/);
    expect(question).toMatch(/Снять с сайта/);
    expect(listed()).toEqual([]);
    expect(screen.queryByText(/Выбрано:/)).toBeNull();
  });

  it('keeps the selected products when the deletion is not confirmed', async () => {
    await openCatalog();
    window.confirm.mockReturnValue(false);
    selectBoth();
    fireEvent.click(screen.getByRole('button', { name: 'Удалить выбранные' }));
    expect(listed()).toEqual(['Tocador Doble Cajonera', 'Tocador Compacto']);
    expect(screen.getByText('Выбрано: 2')).toBeTruthy();
  });
});
