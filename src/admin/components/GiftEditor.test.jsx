import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GiftEditor from './GiftEditor.jsx';

const allProducts = [
  { id: 'Estanteria-E-03', name: 'Estantería', reference: 'E-03', categoryName: 'Estanterías' },
  { id: 'Tocador-T-01', name: 'Tocador', reference: 'T-01', categoryName: 'Tocadores' },
];

function renderEditor({ value, forProduct = false, excludeId, onChange = () => {} } = {}) {
  return render(
    <GiftEditor
      value={value}
      onChange={onChange}
      allProducts={allProducts}
      excludeId={excludeId}
      forProduct={forProduct}
    />,
  );
}

const productSelect = () => screen.getByLabelText('Подарок к этому товару');
const categorySelect = () => screen.getByLabelText('Подарок ко всем товарам категории');

describe('GiftEditor — a product', () => {
  it('follows its category by default', () => {
    renderEditor({ forProduct: true });
    expect(productSelect().value).toBe('inherit');
    expect(screen.queryByLabelText('Что дарим')).toBeNull();
  });

  it('reads an override of its own as such', () => {
    renderEditor({
      forProduct: true,
      value: { mode: 'own', source: 'catalog', productId: 'Estanteria-E-03' },
    });
    expect(productSelect().value).toBe('catalog');
    expect(screen.getByLabelText('Что дарим').value).toBe('Estanteria-E-03');
  });

  it('marks an override as the product’s own, so it wins over the rule', () => {
    const onChange = vi.fn();
    renderEditor({ forProduct: true, onChange });
    fireEvent.change(productSelect(), { target: { value: 'catalog' } });
    expect(onChange).toHaveBeenCalledWith({ mode: 'own', source: 'catalog' });
  });

  it('opts out of the category rule without naming anything', () => {
    const onChange = vi.fn();
    renderEditor({ forProduct: true, onChange });
    fireEvent.change(productSelect(), { target: { value: 'off' } });
    expect(onChange).toHaveBeenCalledWith({ mode: 'off' });
  });

  it('goes back to inheriting by dropping the override entirely', () => {
    const onChange = vi.fn();
    renderEditor({ forProduct: true, value: { mode: 'off' }, onChange });
    fireEvent.change(productSelect(), { target: { value: 'inherit' } });
    expect(onChange).toHaveBeenCalledWith({});
  });

  it('cannot be given away with itself', () => {
    renderEditor({
      forProduct: true,
      excludeId: 'Tocador-T-01',
      value: { mode: 'own', source: 'catalog' },
    });
    const ids = [...screen.getByLabelText('Что дарим').options].map((o) => o.value);
    expect(ids).toEqual(['', 'Estanteria-E-03']);
  });
});

describe('GiftEditor — a category rule', () => {
  it('starts with no offer and no mode of its own', () => {
    const onChange = vi.fn();
    renderEditor({ onChange });
    expect(categorySelect().value).toBe('none');
    fireEvent.change(categorySelect(), { target: { value: 'catalog' } });
    expect(onChange).toHaveBeenCalledWith({ source: 'catalog' });
  });

  it('shows the price unless the switch is turned off', () => {
    renderEditor({ value: { source: 'catalog', productId: 'Estanteria-E-03' } });
    expect(screen.getByLabelText(/Показывать цену подарка/).checked).toBe(true);
  });

  it('reports the price switch being turned off', () => {
    const onChange = vi.fn();
    renderEditor({ value: { source: 'catalog', productId: 'Estanteria-E-03' }, onChange });
    fireEvent.click(screen.getByLabelText(/Показывать цену подарка/));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ showPrice: false }));
  });
});

describe('GiftEditor — a gift the shop does not sell', () => {
  it('asks for the name in both languages', () => {
    const onChange = vi.fn();
    renderEditor({ value: { source: 'custom', name: { es: 'Funda' } }, onChange });
    expect(screen.getByLabelText('Название подарка (исп.)').value).toBe('Funda');
    fireEvent.change(screen.getByLabelText('Название подарка (англ.)'), {
      target: { value: 'Cover' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ name: { es: 'Funda', en: 'Cover' } }),
    );
  });

  it('keeps what was typed when the source is switched and switched back', () => {
    const onChange = vi.fn();
    const typed = { source: 'custom', name: { es: 'Funda' }, size: '120 cm' };
    renderEditor({ value: typed, onChange });
    fireEvent.change(categorySelect(), { target: { value: 'catalog' } });
    expect(onChange).toHaveBeenCalledWith({ ...typed, source: 'catalog' });
  });
});
