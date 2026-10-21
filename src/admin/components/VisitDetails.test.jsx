import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as api from '../api.js';
import OrderRow from './OrderRow.jsx';

vi.mock('../api.js', () => ({ fetchOrderVisit: vi.fn() }));

const NOW = new Date(2026, 9, 21, 12, 0);

const ORDER = {
  id: 51,
  createdAt: new Date(2026, 9, 21, 7, 9, 23).toISOString(),
  name: 'Belén',
  phone: '+34635849790',
  country: 'ES',
  postalCode: '08923',
  address: 'Carrer de Roger de Llúria',
  comment: '',
  productId: 'Espejo-Alto-D02',
  productName: 'Espejo | Arqueado',
  price: 159,
  attributionLabel: 'chatgpt.com',
  telegramSent: true,
  emailSent: true,
  status: 'new',
  note: '',
};

const at = (h, m, s) => new Date(2026, 9, 21, h, m, s).toISOString();

const VISIT = {
  start: at(7, 6, 46),
  orderAt: at(7, 9, 24),
  entryUrl: 'https://hsmuebles.es/otros-modelos/Espejo-Alto-D02?utm_source=chatgpt.com',
  entryReferrer: null,
  events: [
    {
      type: 'page',
      at: at(7, 6, 46),
      path: '/otros-modelos/Espejo-Alto-D02',
      label: 'Товар «Espejo Arqueado»',
    },
    { type: 'photos', at: at(7, 7, 56), count: 5, total: 6 },
    { type: 'order', at: at(7, 9, 24) },
  ],
  earlierVisits: [],
  earlierCount: 0,
  provider: { name: 'Movistar', domain: 'rima-tde.net' },
};

function renderRow() {
  render(
    <MemoryRouter>
      <OrderRow order={ORDER} now={NOW} onUpdate={vi.fn()} onRemove={vi.fn()} />
    </MemoryRouter>,
  );
  return screen.getByRole('button', { name: 'Подробности визита' });
}

describe('Подробности визита', () => {
  it('reads the log only when asked, and tells the visit', async () => {
    api.fetchOrderVisit.mockReset().mockResolvedValue({ visit: VISIT });
    const button = renderRow();
    expect(api.fetchOrderVisit).not.toHaveBeenCalled();

    fireEvent.click(button);

    expect(api.fetchOrderVisit).toHaveBeenCalledWith(51);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(await screen.findByText('Вход: Товар «Espejo Arqueado»')).toBeTruthy();
    expect(screen.getByText('07:06:46')).toBeTruthy();
    expect(screen.getByText('Открыли крупно 5 фото из 6')).toBeTruthy();
    expect(screen.getByText('Отправили заявку')).toBeTruthy();
    expect(
      screen.getByText('На сайте 2 мин 38 с до заявки · Интернет: Movistar (rima-tde.net)'),
    ).toBeTruthy();
    expect(screen.getByText('Раньше за 14 дней не заходили.')).toBeTruthy();
  });

  it('shows the whole entry link as text, and the page that sent it', async () => {
    api.fetchOrderVisit.mockReset().mockResolvedValue({
      visit: { ...VISIT, entryReferrer: 'https://l.instagram.com/' },
    });
    fireEvent.click(renderRow());

    const link = await screen.findByText(VISIT.entryUrl);
    expect(link.closest('p').textContent).toBe(`Ссылка входа: ${VISIT.entryUrl}`);
    // Not a link: opening it would count as a visit from that utm_source.
    expect(link.closest('a')).toBeNull();
    expect(screen.getByText('https://l.instagram.com/').closest('p').textContent).toBe(
      'Пришли со страницы: https://l.instagram.com/',
    );
  });

  it('keeps what it read when folded and opened again', async () => {
    api.fetchOrderVisit.mockReset().mockResolvedValue({ visit: VISIT });
    const button = renderRow();
    fireEvent.click(button);
    await screen.findByText('Отправили заявку');

    fireEvent.click(screen.getByRole('button', { name: 'Скрыть подробности' }));
    expect(screen.queryByText('Отправили заявку')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Подробности визита' }));

    expect(screen.getByText('Отправили заявку')).toBeTruthy();
    expect(api.fetchOrderVisit).toHaveBeenCalledTimes(1);
  });

  it('lists the earlier visits', async () => {
    api.fetchOrderVisit.mockReset().mockResolvedValue({
      visit: {
        ...VISIT,
        earlierCount: 2,
        earlierVisits: [
          {
            start: at(9, 0, 0),
            end: at(9, 5, 0),
            pages: ['Главная', 'Категория «Espejos»'],
            ordered: false,
          },
        ],
      },
    });
    fireEvent.click(renderRow());

    expect(await screen.findByText('Раньше заходили 2 раза за 14 дней:')).toBeTruthy();
    expect(screen.getByText('сегодня, 09:00: Главная, Категория «Espejos»')).toBeTruthy();
    expect(screen.getByText('и ещё 1')).toBeTruthy();
  });

  it('says plainly when the log of that day is gone', async () => {
    api.fetchOrderVisit.mockReset().mockResolvedValue({ visit: null, reason: 'expired' });
    fireEvent.click(renderRow());

    expect(
      await screen.findByText('Журнал за тот день уже удалён: сервер хранит его 14 дней.'),
    ).toBeTruthy();
  });

  it('offers to try again when the request fails', async () => {
    api.fetchOrderVisit
      .mockReset()
      .mockRejectedValueOnce(new Error('Ошибка запроса (500)'))
      .mockResolvedValueOnce({ visit: VISIT });
    fireEvent.click(renderRow());

    expect(
      await screen.findByText(/Не удалось получить подробности: Ошибка запроса \(500\)/),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Ещё раз' }));

    expect(await screen.findByText('Отправили заявку')).toBeTruthy();
  });
});
