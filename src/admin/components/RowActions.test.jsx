import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RowActions from './RowActions.jsx';
import { MenuItem } from './OverflowMenu.jsx';

// jsdom reports 1024px by default — the desktop arrangement. The compact one
// is what a phone gets, and useIsCompact reads window.innerWidth (see the note
// there for why not matchMedia).
const DESKTOP = 1024;
const PHONE = 390;

const labels = {
  more: 'Действия с товаром',
  duplicate: 'Дублировать товар',
  up: 'Переместить выше',
  down: 'Переместить ниже',
  remove: 'Удалить товар',
};

function renderActions({ width = DESKTOP, extras, ...props } = {}) {
  window.innerWidth = width;
  const handlers = { onDuplicate: vi.fn(), onMove: vi.fn(), onRemove: vi.fn() };
  render(
    <RowActions
      labels={labels}
      isFirst={false}
      isLast={false}
      extras={extras}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

const openMenu = () => fireEvent.click(screen.getByRole('button', { name: labels.more }));

afterEach(() => {
  window.innerWidth = DESKTOP;
});

describe('RowActions — desktop', () => {
  it('keeps the four controls in the row, with no menu', () => {
    renderActions();
    expect(screen.getByTitle(labels.duplicate)).toBeTruthy();
    expect(screen.getByTitle(labels.up)).toBeTruthy();
    expect(screen.getByTitle(labels.down)).toBeTruthy();
    expect(screen.getByTitle(labels.remove)).toBeTruthy();
    expect(screen.queryByRole('button', { name: labels.more })).toBeNull();
  });

  it('disables the arrow that would move the row off the ends', () => {
    renderActions({ isFirst: true });
    expect(screen.getByTitle(labels.up).disabled).toBe(true);
    expect(screen.getByTitle(labels.down).disabled).toBe(false);
  });

  it('reports the direction it was asked to move', () => {
    const { onMove } = renderActions();
    fireEvent.click(screen.getByTitle(labels.down));
    expect(onMove).toHaveBeenCalledWith(1);
  });

  it('ignores `extras` — those controls keep their own widgets here', () => {
    renderActions({ extras: <MenuItem>Нет в наличии</MenuItem> });
    expect(screen.queryByText('Нет в наличии')).toBeNull();
  });
});

describe('RowActions — phone', () => {
  it('hides the controls behind one "⋯" button', () => {
    renderActions({ width: PHONE });
    expect(screen.getByRole('button', { name: labels.more })).toBeTruthy();
    expect(screen.queryByRole('menuitem')).toBeNull();
  });

  it('reveals every action once the menu is open', () => {
    renderActions({ width: PHONE });
    openMenu();
    const names = screen.getAllByRole('menuitem').map((el) => el.textContent);
    expect(names.some((n) => n.includes(labels.duplicate))).toBe(true);
    expect(names.some((n) => n.includes(labels.up))).toBe(true);
    expect(names.some((n) => n.includes(labels.down))).toBe(true);
    expect(names.some((n) => n.includes(labels.remove))).toBe(true);
  });

  it('runs the action that was picked', () => {
    const { onDuplicate, onRemove } = renderActions({ width: PHONE });
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: new RegExp(labels.duplicate) }));
    expect(onDuplicate).toHaveBeenCalled();
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: new RegExp(labels.remove) }));
    expect(onRemove).toHaveBeenCalled();
  });

  it('closes after a pick, so the menu never covers the result', () => {
    renderActions({ width: PHONE });
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: new RegExp(labels.duplicate) }));
    expect(screen.queryByRole('menuitem')).toBeNull();
  });

  it('still disables the arrow at the end of the list', () => {
    renderActions({ width: PHONE, isLast: true });
    openMenu();
    expect(screen.getByRole('menuitem', { name: new RegExp(labels.down) }).disabled).toBe(true);
  });

  it('shows `extras` — the state controls that have no room in the row', () => {
    renderActions({ width: PHONE, extras: <MenuItem>Нет в наличии</MenuItem> });
    openMenu();
    expect(screen.getByRole('menuitem', { name: 'Нет в наличии' })).toBeTruthy();
  });

  it('closes on Escape', () => {
    renderActions({ width: PHONE });
    openMenu();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menuitem')).toBeNull();
  });
});
