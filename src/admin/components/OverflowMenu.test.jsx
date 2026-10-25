import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OverflowMenu, { MenuItem } from './OverflowMenu.jsx';
import { menuPosition } from '../menuPosition.js';

const viewport = { width: 1200, height: 800 };
const menu = { width: 240, height: 300 };
// A trigger's rect, as getBoundingClientRect() reports it.
const at = (top, left, size = 40) => ({ top, bottom: top + size, left, right: left + size });

describe('menuPosition', () => {
  it('opens below the trigger, right edges lined up', () => {
    expect(menuPosition(at(100, 600), menu, viewport)).toEqual({
      top: 144,
      left: 400,
      maxHeight: 784,
    });
  });

  it('opens above when there is no room below and more above', () => {
    // The last row of a long list, near the bottom of the window.
    expect(menuPosition(at(700, 600), menu, viewport).top).toBe(396);
  });

  it('slides onto the screen, over its trigger, when neither side has room', () => {
    // A row menu on a phone: 468px tall, its button in the middle of 844px.
    const phone = { width: 390, height: 844 };
    const tall = { width: 252, height: 468 };
    const { top } = menuPosition({ top: 399.5, bottom: 443.5, left: 330, right: 374 }, tall, phone);
    expect(top).toBe(368);
    expect(top + tall.height).toBeLessThanOrEqual(phone.height - 8);
  });

  it('pins a menu taller than the window to the top and caps its height', () => {
    const tiny = { width: 1200, height: 300 };
    expect(menuPosition(at(150, 600), menu, tiny)).toMatchObject({ top: 8, maxHeight: 284 });
  });

  it('lines up left edges for align="left" and keeps inside the window', () => {
    expect(menuPosition(at(100, 20), menu, viewport, 'left').left).toBe(20);
    expect(menuPosition(at(100, 1100), menu, viewport, 'left').left).toBe(952);
    expect(menuPosition(at(100, 10), menu, viewport).left).toBe(8);
  });
});

function Menu({ onPick = () => {} }) {
  return (
    <div data-testid="clipping-box" style={{ overflow: 'auto' }}>
      <OverflowMenu title="Действия">
        <MenuItem onClick={onPick}>Снять с сайта</MenuItem>
      </OverflowMenu>
    </div>
  );
}

const open = () => fireEvent.click(screen.getByRole('button', { name: 'Действия' }));

describe('OverflowMenu', () => {
  it('opens on top of the page, outside any box that could clip it', () => {
    render(<Menu />);
    open();
    const popover = screen.getByRole('menu', { name: 'Действия' });
    expect(popover.parentElement).toBe(document.body);
    expect(screen.getByTestId('clipping-box').contains(popover)).toBe(false);
    expect(popover.style.position === 'fixed' || popover.className.includes('fixed')).toBe(true);
    // Measured and placed before paint, so it is never left invisible.
    expect(popover.style.visibility).not.toBe('hidden');
  });

  it('treats a press inside the popover as inside', () => {
    let picked = 0;
    render(<Menu onPick={() => (picked += 1)} />);
    open();
    const item = screen.getByRole('menuitem', { name: 'Снять с сайта' });
    fireEvent.mouseDown(item);
    expect(screen.getByRole('menu')).toBeTruthy();
    fireEvent.click(item);
    expect(picked).toBe(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes on a press outside and on Escape', () => {
    render(<Menu />);
    open();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
    open();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('follows its trigger when the page scrolls', () => {
    render(<Menu />);
    const button = screen.getByRole('button', { name: 'Действия' });
    button.getBoundingClientRect = () => at(100, 600);
    open();
    const popover = screen.getByRole('menu');
    const before = popover.style.top;
    button.getBoundingClientRect = () => at(60, 600);
    fireEvent.scroll(window);
    expect(popover.style.top).not.toBe(before);
    expect(popover.style.top).toBe('104px');
  });
});
