import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UtmBuilder from './UtmBuilder.jsx';

// Код на входе — не защита, а табличка для случайного посетителя (см. комментарий
// в самой странице). Проверяем ровно то, что он обещает: без кода формы не
// видно, с кодом видно, и второй раз он не спрашивается.
const CODE = '777111';

const enter = (value) => {
  fireEvent.change(screen.getByLabelText('Код доступа'), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Войти' }));
};

describe('UtmBuilder — код доступа', () => {
  beforeEach(() => localStorage.clear());

  it('без кода показывает только экран входа', () => {
    render(<UtmBuilder />);
    expect(screen.getByLabelText('Код доступа')).toBeTruthy();
    expect(screen.queryByLabelText('utm_source')).toBeNull();
  });

  it('на неверный код ругается и не пускает', () => {
    render(<UtmBuilder />);
    enter('123456');
    expect(screen.getByText('Неверный код.')).toBeTruthy();
    expect(screen.queryByLabelText('utm_source')).toBeNull();
  });

  it('с верным кодом открывает генератор', () => {
    render(<UtmBuilder />);
    enter(CODE);
    expect(screen.getByLabelText('utm_source')).toBeTruthy();
    expect(screen.queryByLabelText('Код доступа')).toBeNull();
  });

  it('второй раз код не спрашивает', () => {
    const first = render(<UtmBuilder />);
    enter(CODE);
    first.unmount();
    render(<UtmBuilder />);
    expect(screen.getByLabelText('utm_source')).toBeTruthy();
  });
});

describe('UtmBuilder — сборка ссылки', () => {
  beforeEach(() => {
    localStorage.clear();
    render(<UtmBuilder />);
    enter(CODE);
  });

  // Ссылка на странице в двух местах: панель для широкого экрана и полоса внизу
  // для телефона — какое из них видно, решает CSS, а не разметка.
  it('открывается с готовой ссылкой, а не с пустой формой', () => {
    expect(screen.getAllByText(/hsmuebles\.es\/tocadores/).length).toBeGreaterThan(0);
  });

  // Главное, ради чего страница и делалась: адрес товара вставляют из адресной
  // строки целиком, вместе с чужими параметрами.
  it('принимает в адрес полную ссылку товара и чистит её', () => {
    fireEvent.change(screen.getByLabelText(/Вставьте адрес страницы/), {
      target: { value: 'https://hsmuebles.es/tocadores/Tocador-L-01?utm_source=old#top' },
    });
    expect(screen.getAllByText(/hsmuebles\.es\/tocadores\/Tocador-L-01\?/).length).toBeGreaterThan(
      0,
    );
  });

  it('подписывает ошибку под тем полем, где она сделана', () => {
    fireEvent.change(screen.getByLabelText('utm_campaign'), {
      target: { value: 'rebajas marzo' },
    });
    expect(screen.getByText('Есть пробел — замените на дефис.')).toBeTruthy();
  });
});
