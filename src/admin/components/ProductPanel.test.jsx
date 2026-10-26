import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DEFAULT_PERK_VARIANT, PERK_VARIANTS } from '../../data/catalog.js';
import { applyUpdate } from '../update.js';
import ProductPanel from './ProductPanel.jsx';

const product = (extra = {}) => ({
  id: 'Tocador-M-05',
  name: 'Tocador Aria',
  reference: 'M-05',
  price: 489,
  oldPrice: 650,
  media: [
    { type: 'video', src: '/uploads/clip.mp4' },
    { type: 'image', src: '/uploads/cover.jpg' },
    { type: 'image', src: '/uploads/second.jpg' },
  ],
  material: { es: '', en: '' },
  description: { es: '', en: '' },
  ...extra,
});
const CATEGORY = { slug: 'tocadores', name: { es: 'Tocadores' }, products: [] };

function renderPanel(p = product(), props = {}) {
  const onChange = vi.fn();
  const handlers = {
    onClose: vi.fn(),
    onRename: vi.fn(),
    onDuplicate: vi.fn(),
    onRemove: vi.fn(),
    idError: vi.fn(() => ''),
  };
  render(
    <MemoryRouter>
      <ProductPanel
        product={p}
        category={CATEGORY}
        gift={null}
        siteLink={{ href: '/tocadores/Tocador-M-05', label: 'Открыть на сайте' }}
        allProducts={[]}
        sheet
        prev={null}
        next={null}
        onChange={onChange}
        {...handlers}
        {...props}
      />
    </MemoryRouter>,
  );
  // The product as the change it handed up would leave it (see ../update.js).
  const written = () => applyUpdate(onChange.mock.calls.at(-1)[0], p);
  return { onChange, written, ...handlers };
}

const openTab = (name) => fireEvent.click(screen.getByRole('tab', { name: new RegExp(name) }));

describe('ProductPanel — frame', () => {
  it('names the product and where it is', () => {
    renderPanel();
    expect(screen.getByRole('dialog', { name: 'Tocador Aria' })).toBeTruthy();
    expect(screen.getByText('M-05 · Tocadores · 2 фото')).toBeTruthy();
  });

  it('links to the page on the site under the name it is given', () => {
    renderPanel(product(), {
      siteLink: { href: '/otros-modelos/Tocador-M-05', label: 'Адрес на сайте (ведёт в каталог)' },
    });
    const link = screen.getByRole('link', { name: 'Адрес на сайте (ведёт в каталог)' });
    expect(link.getAttribute('href')).toBe('/otros-modelos/Tocador-M-05');
  });

  it('closes, and on Escape too', () => {
    const { onClose } = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть товар' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('steps to the neighbours, and stops at the ends', () => {
    renderPanel(product(), { next: { href: '?product=B', label: 'B-01' } });
    expect(screen.getByRole('link', { name: 'Следующий товар: B-01' }).getAttribute('href')).toBe(
      '/?product=B',
    );
    expect(
      screen.getByRole('link', { name: 'Предыдущий товар' }).getAttribute('aria-disabled'),
    ).toBe('true');
  });

  it('counts the media and the «Похожие» on their tabs', () => {
    renderPanel(product({ related: ['A', 'B'] }));
    expect(screen.getByRole('tab', { name: 'Фото и видео 3' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Похожие 2' })).toBeTruthy();
  });

  it('shows the cover first among the photos, skipping a leading video', () => {
    renderPanel();
    const [first] = document.querySelectorAll('#product-photos ~ ul img, [role="tabpanel"] ul img');
    expect(first.getAttribute('src')).toContain('/uploads/cover');
    expect(screen.getByText('Обложка')).toBeTruthy();
  });

  it('keeps the open tab when the next product comes in', () => {
    // Someone going through the photos of a category lands on the photos of
    // the next product, not back on «Основное».
    const panel = (p) => (
      <MemoryRouter>
        <ProductPanel
          product={p}
          category={CATEGORY}
          gift={null}
          siteLink={{ href: '/tocadores/Tocador-M-05', label: 'Открыть на сайте' }}
          allProducts={[]}
          sheet
          onClose={() => {}}
          onChange={() => {}}
          idError={() => ''}
          onRename={() => {}}
          onDuplicate={() => {}}
          onRemove={() => {}}
        />
      </MemoryRouter>
    );
    const { rerender } = render(panel(product()));
    openTab('Описание');
    rerender(panel(product({ id: 'Tocador-M-06', name: 'Tocador Bella' })));
    expect(screen.getByRole('dialog', { name: 'Tocador Bella' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Описание' }).getAttribute('aria-selected')).toBe(
      'true',
    );
  });
});

describe('ProductPanel — state up top', () => {
  it('flips availability', () => {
    const { written } = renderPanel();
    fireEvent.click(screen.getByRole('switch', { name: 'В наличии' }));
    expect(written().inStock).toBe(false);
  });

  it('defaults to «Показывать» and writes the chosen visibility back', () => {
    const { written } = renderPanel();
    const select = screen.getByRole('combobox', { name: 'Видимость товара' });
    expect(select.value).toBe('public');
    fireEvent.change(select, { target: { value: 'unlisted' } });
    expect(written().visibility).toBe('unlisted');
  });

  it('explains a hidden product', () => {
    renderPanel(product({ visibility: 'unlisted' }));
    expect(screen.getByText(/но его страница открывается по прямой ссылке/)).toBeTruthy();
  });
});

describe('ProductPanel — main tab', () => {
  it('writes the price and shows the discount it makes', () => {
    const { written } = renderPanel();
    expect(screen.getByText('−25%')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Цена (€)'), { target: { value: '459' } });
    expect(written().price).toBe(459);
  });

  it('has the sale badge on unless switched off', () => {
    const { written } = renderPanel();
    const box = screen.getByRole('checkbox', { name: /плашку со скидкой/ });
    expect(box.checked).toBe(true);
    fireEvent.click(box);
    expect(written().showDiscountBadge).toBe(false);
  });

  it('reflects a product that has the sale badge off', () => {
    renderPanel(product({ showDiscountBadge: false }));
    expect(screen.getByRole('checkbox', { name: /плашку со скидкой/ }).checked).toBe(false);
  });

  it('warns about an article number typed with non-Latin letters', () => {
    renderPanel(product({ reference: 'Լ-23' }));
    expect(screen.getByRole('alert').textContent).toMatch(/нелатинские буквы/);
  });

  it('keeps the id locked until asked, then checks the new one', () => {
    const idError = vi.fn((oldId, newId) => (newId === 'Taken' ? 'Такой ID уже есть' : ''));
    const { onRename } = renderPanel(product(), { idError });
    expect(screen.queryByLabelText('Адрес страницы (ID)')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Изменить…' }));
    const input = screen.getByLabelText('Адрес страницы (ID)');

    fireEvent.change(input, { target: { value: 'Taken' } });
    expect(screen.getByRole('alert').textContent).toBe('Такой ID уже есть');
    expect(screen.getByRole('button', { name: 'Применить' }).disabled).toBe(true);

    // Typed the way the URL needs it: no spaces, no accents.
    fireEvent.change(input, { target: { value: 'Tocador M 06 ñ' } });
    expect(input.value).toBe('Tocador-M-06-n');
    fireEvent.click(screen.getByRole('button', { name: 'Применить' }));
    expect(onRename).toHaveBeenCalledWith('Tocador-M-05', 'Tocador-M-06-n');
  });
});

describe('ProductPanel — promotions tab', () => {
  it('defaults the perk to the original variant and offers every one', () => {
    renderPanel();
    openTab('Акции');
    const select = screen.getByLabelText('Третий пункт');
    expect(select.value).toBe(DEFAULT_PERK_VARIANT);
    expect([...select.options].map((o) => o.value)).toEqual(PERK_VARIANTS);
  });

  it('writes the chosen perk back', () => {
    const { written } = renderPanel();
    openTab('Акции');
    fireEvent.change(screen.getByLabelText('Третий пункт'), { target: { value: 'bulbs' } });
    expect(written().perks).toBe('bulbs');
  });

  it('has the bulbs badge on by itself where the perk already promises bulbs', () => {
    renderPanel(product({ perks: 'bulbs' }));
    openTab('Акции');
    expect(screen.getByRole('checkbox', { name: /лампочки в подарок/ }).checked).toBe(true);
  });

  it('writes an explicit bulbs answer back', () => {
    const { written } = renderPanel();
    openTab('Акции');
    const box = screen.getByRole('checkbox', { name: /лампочки в подарок/ });
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    expect(written().showBulbsBadge).toBe(true);
  });
});

describe('ProductPanel — text tab', () => {
  it('writes each language of the description on its own', () => {
    const p = product({ description: { es: 'Hola', en: 'Hi' } });
    const { written } = renderPanel(p);
    openTab('Описание');
    fireEvent.change(screen.getByLabelText('Описание (англ.)'), { target: { value: 'Hello' } });
    expect(written().description).toEqual({ es: 'Hola', en: 'Hello' });
  });
});

describe('ProductPanel — footer', () => {
  it('duplicates and removes', () => {
    const { onDuplicate, onRemove } = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Дублировать' }));
    fireEvent.click(screen.getByRole('button', { name: 'Удалить товар' }));
    expect(onDuplicate).toHaveBeenCalled();
    expect(onRemove).toHaveBeenCalled();
  });
});
