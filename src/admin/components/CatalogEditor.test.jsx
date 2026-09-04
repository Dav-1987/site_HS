import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// The toolbar is what a phone screen used to lose: it was ~700px wide, so
// "Сохранить" sat past the right edge. These tests pin down what stays in the
// row at each width.
const DESKTOP = 1024;
const PHONE = 390;

const h = vi.hoisted(() => ({ state: null }));
vi.mock('../useCatalogEditor.js', () => ({ useCatalogEditor: () => h.state }));

const { default: CatalogEditor } = await import('./CatalogEditor.jsx');

beforeEach(() => {
  h.state = {
    categories: [],
    settings: null,
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
});

afterEach(() => {
  window.innerWidth = DESKTOP;
});

function renderEditor(width = PHONE, onLogout = vi.fn()) {
  window.innerWidth = width;
  render(<CatalogEditor onLogout={onLogout} />);
  return onLogout;
}

const openMenu = () => fireEvent.click(screen.getByRole('button', { name: 'Меню админки' }));

describe('CatalogEditor toolbar — phone', () => {
  it('keeps "Сохранить" in the row, where it can always be reached', () => {
    renderEditor();
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeTruthy();
  });

  it('moves the rest behind the "⋯" menu', () => {
    renderEditor();
    expect(screen.queryByRole('button', { name: 'Заявки' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Выйти' })).toBeNull();
    openMenu();
    expect(screen.getByRole('menuitem', { name: 'Заявки' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'История' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /Пересобрать сайт/ })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Выйти' })).toBeTruthy();
  });

  it('logs out from the menu', () => {
    const onLogout = renderEditor();
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Выйти' }));
    expect(onLogout).toHaveBeenCalled();
  });

  it('opens the orders panel from the menu', () => {
    renderEditor();
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Заявки' }));
    expect(screen.getByRole('heading', { name: 'Заявки' })).toBeTruthy();
  });

  it('still warns about unsaved edits', () => {
    h.state.dirty = true;
    renderEditor();
    expect(screen.getByText('Есть несохранённые изменения')).toBeTruthy();
  });
});

describe('CatalogEditor toolbar — desktop', () => {
  it('keeps every button in the row, with no menu', () => {
    renderEditor(DESKTOP);
    expect(screen.queryByRole('button', { name: 'Меню админки' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Заявки' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'История' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Выйти' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeTruthy();
  });
});

describe('CatalogEditor toolbar — save button', () => {
  it('is disabled while there is nothing to save', () => {
    renderEditor();
    expect(screen.getByRole('button', { name: 'Сохранить' }).disabled).toBe(true);
  });

  it('saves once something changed', () => {
    h.state.settingsDirty = true;
    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(h.state.save).toHaveBeenCalled();
  });
});
