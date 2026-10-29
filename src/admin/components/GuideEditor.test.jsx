import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import GuideEditor from './GuideEditor.jsx';
import { applyUpdate } from '../update.js';
import { newGuide } from '../guideOps.js';

vi.mock('../api.js', () => ({ uploadImage: vi.fn() }));

const catalog = [
  {
    slug: 'tocadores',
    name: { es: 'Tocadores', en: 'Dressing Tables' },
    products: [
      { id: 'T-120', name: 'Tocador | Hollywood', size: '120 × 40 × 160 cm', perks: 'bulbs' },
      { id: 'T-80', name: 'Tocador | Compacto', size: '80 × 40 × 160 cm', perks: 'bulbs' },
      { id: 'T-OFF', name: 'Tocador | Retirado', size: '60 × 40 × 160 cm', visibility: 'off' },
    ],
  },
];

function Harness({ initial, onRemove = vi.fn() }) {
  const [draft, setDraft] = useState(initial);
  return (
    <GuideEditor
      draft={draft}
      dirty={false}
      slugError=""
      onChange={(next) => setDraft((d) => applyUpdate(next, d))}
      onRemove={onRemove}
      onBack={vi.fn()}
      categories={catalog}
      allProducts={[]}
    />
  );
}

const draft = (extra = {}) => ({ ...newGuide([], 1), ...extra });
const body = () => screen.getByLabelText('Текст статьи');

describe('GuideEditor', () => {
  it('says what a draft still needs for publishing, without alarm', () => {
    render(<Harness initial={draft()} />);
    expect(screen.getByText('Черновик. Для публикации не хватает:')).toBeTruthy();
    expect(screen.getByText(/^испанский: заголовок, описание для Google/)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('turns it into an alert once the article is marked published', () => {
    render(<Harness initial={draft()} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(
      within(screen.getByRole('alert')).getByText(/Не сохранится опубликованной/),
    ).toBeTruthy();
  });

  it('shows where each search already is', () => {
    render(<Harness initial={draft()} />);
    fireEvent.change(screen.getByLabelText(/^Заголовок/), {
      target: { value: 'Medidas de un tocador' },
    });
    fireEvent.change(screen.getByLabelText(/^Ключевые запросы/), {
      target: { value: 'medidas de un tocador\ntocador 80 cm' },
    });
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.map((r) => r.textContent)).toEqual([
      'medidas de un tocador✓ есть— нет— нет',
      'tocador 80 cm— нет— нет— нет',
    ]);
  });

  it('writes the marks for you and previews the page', async () => {
    render(<Harness initial={draft()} />);
    fireEvent.change(body(), { target: { value: 'Altura' } });
    body().setSelectionRange(0, 6);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Подзаголовок' }));
    });
    expect(body().value).toBe('## Altura');
    expect(document.querySelector('h2#altura')).toBeTruthy();
  });

  it('links a model by its address, in its Spanish form, never one taken off the site', async () => {
    render(<Harness initial={draft()} />);
    const select = screen.getByRole('combobox', { name: 'Ссылка на товар' });
    expect(within(select).queryByRole('option', { name: /T-OFF/ })).toBeNull();
    await act(async () => {
      fireEvent.change(select, { target: { value: 'T-80' } });
    });
    expect(body().value).toBe('[Tocador Compacto](/tocadores/T-80)');
  });

  it('warns about words on delivery and assembly', () => {
    render(<Harness initial={draft()} />);
    fireEvent.change(body(), { target: { value: 'El envío y el montaje son gratis.' } });
    expect(screen.getByText(/не говорят о доставке/)).toBeTruthy();
    expect(screen.getByText('Испанский: «envío», «montaje»')).toBeTruthy();
  });

  it('edits the English text on its own tab', () => {
    render(<Harness initial={draft()} />);
    fireEvent.click(screen.getByRole('button', { name: /Английский/ }));
    fireEvent.change(screen.getByLabelText(/^Заголовок/), { target: { value: 'Sizes' } });
    fireEvent.click(screen.getByRole('button', { name: /Испанский/ }));
    expect(screen.getByLabelText(/^Заголовок/).value).toBe('');
  });

  it('shows which models the rule picks right now', () => {
    render(<Harness initial={draft()} />);
    fireEvent.change(screen.getByLabelText('Раздел каталога'), { target: { value: 'tocadores' } });
    const list = screen.getByText('Сейчас в статье').nextElementSibling;
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual([expect.stringContaining('T-80'), expect.stringContaining('T-120')]);
  });

  it('keeps the address of an article that was published', () => {
    render(
      <Harness initial={draft({ publishedAt: '2026-10-01T00:00:00.000Z', slug: 'medidas' })} />,
    );
    expect(screen.getByLabelText(/^Адрес/).readOnly).toBe(true);
    expect(screen.getByText(/Адрес закреплён/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Открыть на сайте' }).getAttribute('href')).toBe(
      '/guias/medidas',
    );
  });

  it('deletes through the section, which asks first', () => {
    const onRemove = vi.fn();
    render(<Harness initial={draft()} onRemove={onRemove} />);
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));
    expect(onRemove).toHaveBeenCalled();
  });
});
