import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProductImagesEditor from './ProductImagesEditor.jsx';

// On a phone the desktop affordances don't exist: HTML5 drag events never fire
// on touch, and the replace/delete overlay is hover-only. Everything they do
// has to be reachable from the tile's own menu instead.
const DESKTOP = 1024;
const PHONE = 390;

const media = [
  { type: 'image', src: '/uploads/one.jpg' },
  { type: 'image', src: '/uploads/two.jpg' },
  { type: 'video', src: '/uploads/clip.mp4' },
];

function renderGrid(width = PHONE, items = media) {
  window.innerWidth = width;
  const onChange = vi.fn();
  const { container } = render(<ProductImagesEditor media={items} onChange={onChange} />);
  return { onChange, container };
}

const openTile = (label) => fireEvent.click(screen.getByRole('button', { name: label }));
const pick = (name) => fireEvent.click(screen.getByRole('menuitem', { name }));

beforeEach(() => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  window.innerWidth = DESKTOP;
  vi.restoreAllMocks();
});

describe('ProductImagesEditor — phone', () => {
  it('gives every tile a menu of its own', () => {
    renderGrid();
    expect(screen.getByRole('button', { name: 'Действия: фото 1' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Действия: фото 2' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Действия: видео 3' })).toBeTruthy();
  });

  it('promotes a photo to the catalog cover', () => {
    const { onChange } = renderGrid();
    openTile('Действия: фото 2');
    pick(/Сделать обложкой/);
    expect(onChange).toHaveBeenCalledWith([media[1], media[0], media[2]]);
  });

  it('offers nothing to promote on the photo that is already the cover', () => {
    renderGrid();
    openTile('Действия: фото 1');
    expect(screen.getByRole('menuitem', { name: /Сделать обложкой/ }).disabled).toBe(true);
  });

  it('leaves a leading video in place when promoting a photo', () => {
    const withLeadingVideo = [media[2], media[0], media[1]];
    const { onChange } = renderGrid(PHONE, withLeadingVideo);
    openTile('Действия: фото 3');
    pick(/Сделать обложкой/);
    // The video keeps the first slot; the cover is the first PHOTO.
    expect(onChange).toHaveBeenCalledWith([media[2], media[1], media[0]]);
  });

  it('never offers to make a video the cover', () => {
    renderGrid();
    openTile('Действия: видео 3');
    expect(screen.queryByRole('menuitem', { name: /Сделать обложкой/ })).toBeNull();
  });

  it('reorders one step at a time — the touch stand-in for dragging', () => {
    const { onChange } = renderGrid();
    openTile('Действия: фото 2');
    pick(/Левее/);
    expect(onChange).toHaveBeenCalledWith([media[1], media[0], media[2]]);
  });

  it('does not offer to move the ends past the ends', () => {
    renderGrid();
    openTile('Действия: фото 1');
    expect(screen.getByRole('menuitem', { name: /Левее/ }).disabled).toBe(true);
    fireEvent.keyDown(document, { key: 'Escape' });
    openTile('Действия: видео 3');
    expect(screen.getByRole('menuitem', { name: /Правее/ }).disabled).toBe(true);
  });

  it('deletes the tile it was opened from', () => {
    const { onChange } = renderGrid();
    openTile('Действия: фото 2');
    pick(/Удалить фото/);
    expect(onChange).toHaveBeenCalledWith([media[0], media[2]]);
  });

  it('keeps a deletion behind the confirm', () => {
    window.confirm.mockReturnValue(false);
    const { onChange } = renderGrid();
    openTile('Действия: фото 2');
    pick(/Удалить фото/);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('can replace the photo behind a tile', () => {
    renderGrid();
    openTile('Действия: фото 2');
    const item = screen.getByText(/Заменить/);
    expect(item.querySelector('input[type="file"]')).toBeTruthy();
  });
});

describe('ProductImagesEditor — desktop', () => {
  it('keeps drag-to-reorder and the hover overlay instead of tile menus', () => {
    const { container } = renderGrid(DESKTOP);
    expect(screen.queryByRole('button', { name: /Действия:/ })).toBeNull();
    expect(container.querySelectorAll('[draggable="true"]').length).toBe(media.length);
    expect(screen.getAllByRole('button', { name: 'Удалить фото' }).length).toBe(2);
  });
});
