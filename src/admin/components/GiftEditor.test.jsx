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

  it('takes a price of its own — nothing supplies one for it', () => {
    const onChange = vi.fn();
    renderEditor({ value: { source: 'custom', name: { es: 'Funda' } }, onChange });
    fireEvent.change(screen.getByLabelText('Цена подарка, €'), { target: { value: '35' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ price: 35 }));
  });

  it('can be told to keep that price to itself', () => {
    const onChange = vi.fn();
    renderEditor({ value: { source: 'custom', name: { es: 'Funda' }, price: 35 }, onChange });
    const toggle = screen.getByLabelText(/Показывать цену подарка/);
    expect(toggle.checked).toBe(true);
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ showPrice: false }));
  });

  // The gallery is edited as an array, but `image` has to keep naming the first
  // of them: that is the field the inset on the photo reads, and the two
  // drifting apart shows one photo in the corner and a different one behind it.
  it('shows the photos it has, old single-photo offers included', () => {
    renderEditor({ value: { source: 'custom', name: { es: 'Funda' }, image: '/uploads/old.jpg' } });
    expect(screen.getByText('В уголке')).toBeTruthy();
  });
});

describe('GiftEditor — сколько штук', () => {
  const rule = { source: 'catalog', productId: 'Estanteria-E-03' };

  it('спрашивает количество и у товара из каталога, и у своего подарка', () => {
    const { unmount } = renderEditor({ value: rule });
    expect(screen.getByLabelText('Сколько штук')).toBeTruthy();
    unmount();
    renderEditor({ value: { source: 'custom', name: { es: 'Funda' } } });
    expect(screen.getByLabelText('Сколько штук')).toBeTruthy();
  });

  it('не спрашивает его там, где подарка нет', () => {
    renderEditor({ forProduct: true });
    expect(screen.queryByLabelText('Сколько штук')).toBeNull();
  });

  it('пустое поле — это «одна штука», а не ноль', () => {
    renderEditor({ value: rule });
    expect(screen.getByLabelText('Сколько штук').value).toBe('');
  });

  it('записывает количество числом', () => {
    const onChange = vi.fn();
    renderEditor({ value: rule, onChange });
    fireEvent.change(screen.getByLabelText('Сколько штук'), { target: { value: '2' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ qty: 2 }));
  });

  it('спрашивает картинку для плашки и подсказывает, что будет без неё', () => {
    renderEditor({ value: rule });
    expect(screen.getByLabelText('Картинка для плашки на фото')).toBeTruthy();
    expect(screen.getByText(/Пусто — плашка возьмёт первое фото подарка/)).toBeTruthy();
  });

  it('записывает картинку плашки отдельно от галереи подарка', () => {
    const onChange = vi.fn();
    renderEditor({ value: rule, onChange });
    fireEvent.change(screen.getByLabelText('Картинка для плашки на фото'), {
      target: { value: '/uploads/closeup.jpg' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ badgeImage: '/uploads/closeup.jpg' }),
    );
  });

  it('очищенное поле возвращает подарок к одной штуке', () => {
    const onChange = vi.fn();
    renderEditor({ value: { ...rule, qty: 3 }, onChange });
    fireEvent.change(screen.getByLabelText('Сколько штук'), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ qty: '' }));
  });
});
