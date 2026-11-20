import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import HomeCatalogOrderEditor from './HomeCatalogOrderEditor.jsx';
import { applyUpdate } from '../update.js';
import { HOLD_MS } from '../useTouchReorder.js';

const products = ['A', 'B', 'C'].map((id) => ({
  id,
  name: `Товар ${id}`,
  reference: id,
  category: { es: 'Espejos' },
}));

const rows = () =>
  within(screen.getByRole('list', { name: 'Порядок товаров каталога на главной' })).getAllByRole(
    'listitem',
  );

describe('HomeCatalogOrderEditor', () => {
  afterEach(() => vi.useRealTimers());

  it('moves products up and down, including positions that were not previously saved', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <HomeCatalogOrderEditor products={products} order={[]} onChange={onChange} />,
    );
    expect(rows().map((row) => row.textContent)).toEqual([
      expect.stringContaining('Товар A'),
      expect.stringContaining('Товар B'),
      expect.stringContaining('Товар C'),
    ]);
    expect(screen.getByRole('button', { name: 'Поднять A' }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Опустить C' }).disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Опустить A' }));
    const order = applyUpdate(onChange.mock.calls.at(-1)[0], []);
    expect(order).toEqual(['B', 'A', 'C']);
    rerender(<HomeCatalogOrderEditor products={products} order={order} onChange={onChange} />);
    expect(rows()[0].textContent).toContain('Товар B');

    fireEvent.click(screen.getByRole('button', { name: 'Поднять C' }));
    expect(applyUpdate(onChange.mock.calls.at(-1)[0], order)).toEqual(['B', 'C', 'A']);
  });

  it('explains when no products are selected for the home catalog', () => {
    render(<HomeCatalogOrderEditor products={[]} order={[]} onChange={() => {}} />);
    expect(screen.getByText('Пока нет товаров для этого блока.')).toBeTruthy();
  });

  it('reorders a product dragged by its handle on desktop', () => {
    const onChange = vi.fn();
    render(<HomeCatalogOrderEditor products={products} order={[]} onChange={onChange} />);
    const transfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
    fireEvent.dragStart(within(rows()[0]).getByTitle('Перетащить товар'), {
      dataTransfer: transfer,
    });
    fireEvent.dragOver(rows()[2], { dataTransfer: transfer });
    fireEvent.drop(rows()[2], { dataTransfer: transfer });
    expect(transfer.setData).toHaveBeenCalledWith('text/plain', 'A');
    expect(applyUpdate(onChange.mock.calls.at(-1)[0], [])).toEqual(['B', 'C', 'A']);
  });

  it('reorders a row held and dragged on a phone', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<HomeCatalogOrderEditor products={products} order={[]} onChange={onChange} />);
    const items = rows();
    items.forEach((row, index) => {
      row.getBoundingClientRect = () => ({ top: 200 + index * 80, height: 80 });
    });
    const touch = (y) => ({ touches: [{ clientX: 20, clientY: y }] });
    fireEvent.touchStart(items[0], touch(240));
    act(() => vi.advanceTimersByTime(HOLD_MS));
    fireEvent.touchMove(items[0], touch(450));
    fireEvent.touchEnd(items[0], { touches: [] });
    expect(applyUpdate(onChange.mock.calls.at(-1)[0], [])).toEqual(['B', 'C', 'A']);
  });
});
