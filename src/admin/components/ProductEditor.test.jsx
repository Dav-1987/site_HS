import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProductEditor from './ProductEditor.jsx';
import { DEFAULT_PERK_VARIANT, PERK_VARIANTS } from '../../data/catalog.js';

const noop = () => {};

// A product whose gallery deliberately starts with a video: the collapsed row
// must show the first PHOTO, matching the catalog cover rule.
const product = {
  id: 'Tocador-M-05',
  name: 'Tocador',
  subtitle: '90 × 40 × 170 cm',
  reference: 'M-05',
  price: 489,
  media: [
    { type: 'video', src: '/uploads/clip.mp4' },
    { type: 'image', src: '/uploads/cover.jpg' },
    { type: 'image', src: '/uploads/second.jpg' },
  ],
  material: { es: '', en: '' },
  description: { es: '', en: '' },
};

function renderEditor(p = product, onChange = noop) {
  return render(
    <ProductEditor
      product={p}
      onChange={onChange}
      onRemove={noop}
      onMove={noop}
      onDuplicate={noop}
      isFirst={false}
      isLast={false}
      allProducts={[]}
    />,
  );
}

const expand = () => fireEvent.click(screen.getByRole('button', { name: /Tocador/ }));
// Внутри открытой карточки каждая группа полей — свой спойлер, поэтому до поля
// теперь два клика: раскрыть товар, раскрыть группу.
const openSection = (title) =>
  fireEvent.click(screen.getByRole('button', { name: new RegExp(title) }));

describe('ProductEditor — collapsed row thumbnail', () => {
  it('shows the cover photo, skipping a leading video', () => {
    const { container } = renderEditor();
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    // resolveImage(src, 200) → nearest pre-generated WebP size.
    expect(img.getAttribute('src')).toBe('/uploads/cover_400.webp');
  });

  it('lazy-loads the thumbnail (a category can hold ~100 rows)', () => {
    const { container } = renderEditor();
    expect(container.querySelector('img').getAttribute('loading')).toBe('lazy');
  });

  it('falls back to the placeholder when the product has no photo', () => {
    const { container } = renderEditor({
      ...product,
      media: [{ type: 'video', src: '/uploads/clip.mp4' }],
    });
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('M')).toBeTruthy();
  });
});

describe('ProductEditor — order perks variant', () => {
  const openPerks = () => {
    expand();
    openSection('Блок с иконками');
  };

  it('defaults to the original variant for a product that never set one', () => {
    renderEditor();
    openPerks();
    expect(screen.getByLabelText('Третий пункт').value).toBe(DEFAULT_PERK_VARIANT);
  });

  it('offers every variant', () => {
    renderEditor();
    openPerks();
    const values = [...screen.getByLabelText('Третий пункт').options].map((o) => o.value);
    expect(values).toEqual(PERK_VARIANTS);
  });

  it('reports the chosen variant on the product', () => {
    const onChange = vi.fn();
    renderEditor(product, onChange);
    openPerks();
    fireEvent.change(screen.getByLabelText('Третий пункт'), { target: { value: 'quality' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ perks: 'quality' }));
  });
});

describe('ProductEditor — visibility', () => {
  const select = () => screen.getByLabelText('Видимость товара');

  it('defaults to "показывать" for a product with no visibility set', () => {
    renderEditor();
    expect(select().value).toBe('public');
    expect(screen.queryByText(/скрыт из списков|снят с сайта/)).toBeNull();
  });

  it('writes the chosen state back through onChange', () => {
    const onChange = vi.fn();
    renderEditor(product, onChange);
    fireEvent.change(select(), { target: { value: 'unlisted' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'unlisted' }));
  });

  it('badges a hidden product in the collapsed row and explains it when opened', () => {
    renderEditor({ ...product, visibility: 'off' });
    expect(select().value).toBe('off');
    expect(screen.getByText('снят с сайта')).toBeTruthy();
    expand();
    expect(screen.getByText(/отдаёт 404/)).toBeTruthy();
  });
});

describe('ProductEditor — sale badge switch', () => {
  const checkbox = () => screen.getByLabelText(/Показывать плашку со скидкой/);
  const openPrice = () => {
    expand();
    openSection('Цена');
  };

  it('is checked for a product with no switch set', () => {
    renderEditor();
    openPrice();
    expect(checkbox().checked).toBe(true);
  });

  it('writes the switch back through onChange', () => {
    const onChange = vi.fn();
    renderEditor(product, onChange);
    openPrice();
    fireEvent.click(checkbox());
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ showDiscountBadge: false }));
  });

  it('reflects a product that already has it off', () => {
    renderEditor({ ...product, showDiscountBadge: false });
    openPrice();
    expect(checkbox().checked).toBe(false);
  });
});

describe('ProductEditor — bulbs badge switch', () => {
  const checkbox = () => screen.getByLabelText(/лампочки в подарок/);
  const openPrice = () => {
    expand();
    openSection('Цена');
  };

  // Ничего не выбрано — плашки нет: третий пункт по умолчанию не «Bombillas».
  it('is off for a product with neither switch nor perk set', () => {
    renderEditor();
    openPrice();
    expect(checkbox().checked).toBe(false);
  });

  it('is on by itself where the product already promises free bulbs', () => {
    renderEditor({ ...product, perks: 'bulbs' });
    openPrice();
    expect(checkbox().checked).toBe(true);
  });

  it('writes an explicit answer back through onChange', () => {
    const onChange = vi.fn();
    renderEditor({ ...product, perks: 'bulbs' }, onChange);
    openPrice();
    fireEvent.click(checkbox());
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ showBulbsBadge: false }));
  });
});

// Раскрытая карточка — это список заголовков групп, а не простыня полей:
// открывается только та группа, которую правят.
describe('ProductEditor — группы полей под спойлерами', () => {
  it('после открытия товара показывает заголовки, но не сами поля', () => {
    renderEditor();
    expand();
    expect(screen.getByRole('button', { name: /Цена/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Фото и видео/ })).toBeTruthy();
    expect(screen.queryByLabelText('Цена (€)')).toBeNull();
    expect(screen.queryByLabelText('Название (исп.)')).toBeNull();
  });

  it('раскрывает и сворачивает одну группу, не трогая остальные', () => {
    renderEditor();
    expand();
    openSection('Цена');
    expect(screen.getByLabelText('Цена (€)')).toBeTruthy();
    expect(screen.queryByLabelText('Название (исп.)')).toBeNull();
    openSection('Цена');
    expect(screen.queryByLabelText('Цена (€)')).toBeNull();
  });

  it('выносит в заголовок то, ради чего группу открывали', () => {
    renderEditor();
    expand();
    // Цена со скидкой, состав галереи и артикул — видны, пока группы закрыты.
    expect(screen.getByRole('button', { name: /Цена.*€489/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Фото и видео.*2 фото · 1 видео/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Артикул и размер.*M-05/ })).toBeTruthy();
  });
});

// On a phone the row has no space for the visibility select and the stock
// switch, so they move into the row's "⋯" menu — the state itself must stay
// changeable without opening the product.
describe('ProductEditor — phone row', () => {
  const PHONE = 390;
  const openRowMenu = () =>
    fireEvent.click(screen.getByRole('button', { name: 'Действия с товаром' }));

  afterEach(() => {
    window.innerWidth = 1024;
  });

  it('still shows which product the row is', () => {
    window.innerWidth = PHONE;
    renderEditor();
    expect(screen.getByText('Tocador')).toBeTruthy();
    expect(screen.getByText('M-05')).toBeTruthy();
  });

  it('drops the inline visibility select in favour of the menu', () => {
    window.innerWidth = PHONE;
    renderEditor();
    expect(screen.queryByLabelText('Видимость товара')).toBeNull();
    openRowMenu();
    expect(screen.getByRole('menuitem', { name: /Показывать/ })).toBeTruthy();
  });

  it('changes visibility from the menu', () => {
    window.innerWidth = PHONE;
    const onChange = vi.fn();
    renderEditor(product, onChange);
    openRowMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /Снять с сайта/ }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'off' }));
  });

  it('flips availability from the menu', () => {
    window.innerWidth = PHONE;
    const onChange = vi.fn();
    renderEditor(product, onChange);
    openRowMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /Нет в наличии/ }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ inStock: false }));
  });
});
