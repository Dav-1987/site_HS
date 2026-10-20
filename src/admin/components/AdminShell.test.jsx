import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// The frame of the admin: its sections, the toolbar, and what stays reachable
// at each width. The editor state and the orders are stubbed — the sections'
// own behaviour is covered by AdminShell.uploads.test.jsx and the editors' tests.
const DESKTOP = 1280;
const PHONE = 390;

const h = vi.hoisted(() => ({ editor: null, orders: null }));
vi.mock('../useCatalogEditor.js', () => ({ useCatalogEditor: () => h.editor }));
vi.mock('../useOrders.js', () => ({ useOrders: () => h.orders }));
vi.mock('../api.js', () => ({
  fetchRebuildStatus: vi.fn(async () => ({ configured: true, run: null })),
  triggerRebuild: vi.fn(),
  listVersions: vi.fn(async () => ({ versions: [] })),
  restoreVersion: vi.fn(),
}));

const { default: AdminRoutes } = await import('../AdminRoutes.jsx');

beforeEach(() => {
  h.editor = {
    categories: [],
    settings: { texts: { es: {}, en: {} }, contact: {}, blocks: {}, hero: {} },
    loadError: '',
    openIdx: null,
    setOpenIdx: vi.fn(),
    dirty: false,
    settingsDirty: false,
    saving: false,
    status: '',
    showHistory: false,
    setShowHistory: vi.fn(),
    allProducts: [],
    categoryOptions: [],
    updateSettings: vi.fn(),
    updateCategory: vi.fn(),
    removeCategory: vi.fn(),
    moveCategory: vi.fn(),
    addCategory: vi.fn(),
    duplicateCategory: vi.fn(),
    moveProducts: vi.fn(),
    save: vi.fn(),
    applyRestored: vi.fn(),
  };
  h.orders = {
    orders: [],
    error: '',
    deletingId: null,
    newCount: 0,
    refresh: vi.fn(),
    remove: vi.fn(),
  };
});

afterEach(() => {
  window.innerWidth = 1024;
});

function renderAdmin({ path = '/admin/catalog', width = DESKTOP, onLogout = vi.fn() } = {}) {
  window.innerWidth = width;
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/*" element={<AdminRoutes onLogout={onLogout} />} />
      </Routes>
    </MemoryRouter>,
  );
  return onLogout;
}

const nav = () => screen.getByRole('navigation', { name: 'Разделы админки' });
const heading = () => screen.getByRole('heading', { level: 1 });
const saveButton = () => screen.getByRole('button', { name: 'Сохранить' });
const pressCtrlS = (init = {}) => {
  const event = new KeyboardEvent('keydown', {
    code: 'KeyS',
    key: 's',
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  window.dispatchEvent(event);
  return event;
};

describe('AdminShell sections', () => {
  it('lists every section, in order, and marks the open one', () => {
    renderAdmin();
    const links = within(nav()).getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual([
      'Заявки',
      'Каталог',
      'Главная страница',
      'Тексты сайта',
      'Настройки',
    ]);
    expect(within(nav()).getByRole('link', { name: 'Каталог' }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(heading().textContent).toBe('Каталог');
  });

  it('switches section by its link', () => {
    renderAdmin();
    fireEvent.click(within(nav()).getByRole('link', { name: 'Главная страница' }));
    expect(heading().textContent).toBe('Главная страница');
    expect(screen.getByRole('button', { name: /Главный экран/ })).toBeTruthy();
  });

  it('opens the section its address names', () => {
    renderAdmin({ path: '/admin/settings' });
    expect(heading().textContent).toBe('Настройки');
    expect(screen.getByRole('button', { name: /Контакты и соцсети/ })).toBeTruthy();
  });

  it('sends /admin itself to the catalog', () => {
    renderAdmin({ path: '/admin' });
    expect(heading().textContent).toBe('Каталог');
  });

  it('sends an address it does not know to the catalog too', () => {
    renderAdmin({ path: '/admin/nope' });
    expect(heading().textContent).toBe('Каталог');
  });

  it('opens the texts unfolded, since they are alone in their section', () => {
    renderAdmin({ path: '/admin/texts' });
    expect(screen.getByText(/Пусто = берётся текст из кода/)).toBeTruthy();
  });

  it('opens the catalog history from the catalog section', () => {
    renderAdmin();
    fireEvent.click(screen.getByRole('button', { name: 'История изменений' }));
    expect(h.editor.setShowHistory).toHaveBeenCalledWith(true);
  });

  it('shows what is loading instead of an empty section', () => {
    h.editor.categories = null;
    renderAdmin();
    expect(screen.getByText('Загрузка…')).toBeTruthy();
  });

  it('shows why the catalog did not load', () => {
    h.editor.categories = null;
    h.editor.loadError = 'Не удалось загрузить каталог';
    renderAdmin();
    expect(screen.getByRole('alert').textContent).toBe('Не удалось загрузить каталог');
  });
});

describe('AdminShell new orders', () => {
  it('counts the orders nobody has called yet on the «Заявки» link', () => {
    h.orders.newCount = 3;
    renderAdmin();
    expect(within(nav()).getByRole('link', { name: /Заявки/ }).textContent).toBe('Заявки 3 новые');
  });

  it('says nothing while there are none', () => {
    renderAdmin();
    expect(within(nav()).getByRole('link', { name: /Заявки/ }).textContent).toBe('Заявки');
  });

  it('refreshes the list on opening «Заявки»', () => {
    renderAdmin({ path: '/admin/orders' });
    expect(h.orders.refresh).toHaveBeenCalled();
    expect(screen.getByText('Все заявки обработаны: новых и незавершённых нет.')).toBeTruthy();
  });
});

describe('AdminShell toolbar — desktop', () => {
  it('keeps «Пересобрать» and «Сохранить» apart in the toolbar, the way out in the sidebar', async () => {
    h.editor.dirty = true;
    const onLogout = renderAdmin();
    expect(screen.queryByRole('button', { name: 'Меню админки' })).toBeNull();
    const toolbar = screen.getByRole('banner');
    expect(await within(toolbar).findByRole('button', { name: 'Пересобрать сайт' })).toBeTruthy();
    expect(within(toolbar).getByRole('button', { name: 'Сохранить' })).toBeTruthy();
    expect(screen.getByText('Есть несохранённые изменения')).toBeTruthy();
    expect(saveButton()).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Открыть сайт' }).getAttribute('href')).toBe('/');
    expect(screen.getByRole('link', { name: 'Ссылки UTM' }).getAttribute('href')).toBe('/utm');
    fireEvent.click(screen.getByRole('button', { name: 'Выйти' }));
    expect(onLogout).toHaveBeenCalled();
  });
});

describe('AdminShell toolbar — phone', () => {
  it('keeps «Сохранить» in the row and the sections in a strip', () => {
    renderAdmin({ width: PHONE });
    expect(saveButton()).toBeTruthy();
    expect(
      within(nav())
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Заявки', 'Каталог', 'Главная', 'Тексты', 'Настройки']);
  });

  it('moves the rebuild and the way out behind "⋯"', () => {
    const onLogout = renderAdmin({ width: PHONE });
    expect(screen.queryByRole('button', { name: 'Выйти' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Меню админки' }));
    expect(screen.getByRole('menuitem', { name: 'Открыть сайт' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Ссылки UTM' })).toBeTruthy();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Выйти' }));
    expect(onLogout).toHaveBeenCalled();
  });

  it('still warns about unsaved edits', () => {
    h.editor.dirty = true;
    renderAdmin({ width: PHONE });
    expect(screen.getByText('Есть несохранённые изменения')).toBeTruthy();
  });
});

describe('AdminShell saving', () => {
  it('disables «Сохранить» while there is nothing to save', () => {
    renderAdmin();
    expect(saveButton().disabled).toBe(true);
  });

  it('saves once something changed', () => {
    h.editor.settingsDirty = true;
    renderAdmin();
    fireEvent.click(saveButton());
    expect(h.editor.save).toHaveBeenCalled();
  });

  it('saves on Ctrl+S and keeps the browser from saving the page', () => {
    h.editor.dirty = true;
    renderAdmin();
    const event = pressCtrlS();
    expect(event.defaultPrevented).toBe(true);
    expect(h.editor.save).toHaveBeenCalledTimes(1);
  });

  it('takes Ctrl+S by the key, whatever the keyboard layout', () => {
    h.editor.dirty = true;
    renderAdmin();
    pressCtrlS({ key: 'ы' });
    pressCtrlS({ key: 'S', ctrlKey: false, metaKey: true });
    expect(h.editor.save).toHaveBeenCalledTimes(2);
  });

  it('does nothing on Ctrl+S with nothing to save', () => {
    renderAdmin();
    expect(pressCtrlS().defaultPrevented).toBe(true);
    expect(h.editor.save).not.toHaveBeenCalled();
  });

  it('does not save twice while a save is running', () => {
    h.editor.dirty = true;
    h.editor.saving = true;
    renderAdmin();
    pressCtrlS();
    expect(h.editor.save).not.toHaveBeenCalled();
  });

  it('leaves other shortcuts alone', () => {
    h.editor.dirty = true;
    renderAdmin();
    expect(pressCtrlS({ shiftKey: true }).defaultPrevented).toBe(false);
    expect(pressCtrlS({ code: 'KeyA', key: 'a' }).defaultPrevented).toBe(false);
    expect(h.editor.save).not.toHaveBeenCalled();
  });
});
