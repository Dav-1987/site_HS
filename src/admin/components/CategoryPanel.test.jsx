import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { applyUpdate } from '../update.js';
import CategoryPanel from './CategoryPanel.jsx';

const category = (extra = {}) => ({
  slug: 'tocadores',
  name: { es: 'Tocadores', en: 'Dressing tables' },
  tagline: { es: '', en: '' },
  description: { es: '', en: '' },
  products: [{ id: 'A' }, { id: 'B' }],
  ...extra,
});

function renderPanel(c = category(), props = {}) {
  const onChange = vi.fn();
  const handlers = { onMove: vi.fn(), onDuplicate: vi.fn(), onRemove: vi.fn(), onClose: vi.fn() };
  render(
    <CategoryPanel
      category={c}
      allProducts={[]}
      sheet
      isFirst
      isLast={false}
      onChange={onChange}
      slugError={() => ''}
      onRename={() => {}}
      {...handlers}
      {...props}
    />,
  );
  return { written: () => applyUpdate(onChange.mock.calls.at(-1)[0], c), ...handlers };
}

describe('CategoryPanel', () => {
  it('names the category and counts its products', () => {
    renderPanel();
    expect(screen.getByRole('dialog', { name: 'Tocadores' })).toBeTruthy();
    expect(screen.getByText('2 товара')).toBeTruthy();
  });

  it('writes one language of a name, keeping the other', () => {
    const { written } = renderPanel();
    fireEvent.change(screen.getByLabelText('Название (англ.)'), { target: { value: 'Vanities' } });
    expect(written().name).toEqual({ es: 'Tocadores', en: 'Vanities' });
    expect(written().products).toHaveLength(2);
  });

  it('cannot move the first category further left', () => {
    const { onMove } = renderPanel();
    expect(screen.getByRole('button', { name: 'Переместить левее' }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Переместить правее' }));
    expect(onMove).toHaveBeenCalledWith(1);
  });

  it('explains what visibility means for the section reached by its tile', () => {
    renderPanel(category({ slug: 'otros-modelos', name: { es: 'Otros Modelos' } }));
    expect(screen.getByText(/Вход в него один: плитка/)).toBeTruthy();
  });

  it('duplicates and removes', () => {
    const { onDuplicate, onRemove } = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Дублировать' }));
    fireEvent.click(screen.getByRole('button', { name: 'Удалить категорию' }));
    expect(onDuplicate).toHaveBeenCalled();
    expect(onRemove).toHaveBeenCalled();
  });
});
