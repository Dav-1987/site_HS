import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OrderRow from './OrderRow.jsx';

afterEach(() => vi.useRealTimers());

const NOW = new Date(2026, 9, 20, 15, 0);

function order(overrides = {}) {
  return {
    id: 1,
    createdAt: new Date(2026, 9, 20, 12, 40).toISOString(),
    name: 'Ana',
    phone: '+33612345678',
    country: 'FR',
    postalCode: '75001',
    address: 'Paris',
    comment: '',
    productId: 'p1',
    productName: 'Tocador Aria',
    price: 450,
    attributionLabel: 'Directo / desconocido',
    telegramSent: true,
    emailSent: false,
    status: 'new',
    note: '',
    ...overrides,
  };
}

function renderRow(o = order(), props = {}) {
  const onUpdate = vi.fn(async () => true);
  const onRemove = vi.fn();
  render(
    <MemoryRouter>
      <OrderRow order={o} now={NOW} onUpdate={onUpdate} onRemove={onRemove} {...props} />
    </MemoryRouter>,
  );
  return { onUpdate, onRemove };
}

describe('OrderRow — status', () => {
  it('shows where the order stands and when it came in', () => {
    renderRow();
    expect(screen.getByRole('combobox', { name: 'Статус заявки от Ana' }).value).toBe('new');
    expect(screen.getByText(/сегодня, 12:40/)).toBeTruthy();
  });

  it('moves the order on through the workflow', () => {
    const { onUpdate } = renderRow();
    fireEvent.change(screen.getByRole('combobox', { name: 'Статус заявки от Ana' }), {
      target: { value: 'called' },
    });
    expect(onUpdate).toHaveBeenCalledWith({ status: 'called' });
  });

  it('says plainly when an order from before statuses has none', () => {
    renderRow(order({ status: null }));
    const select = screen.getByRole('combobox', { name: 'Статус заявки от Ana' });
    expect(select.selectedOptions[0].textContent).toBe('Без статуса');
  });

  it('flags an order whose notification reached nobody', () => {
    renderRow(order({ telegramSent: false, emailSent: false }));
    expect(screen.getByText('Уведомление не дошло')).toBeTruthy();
  });
});

describe('OrderRow — reaching the customer', () => {
  it('calls and writes to the international number', () => {
    renderRow();
    expect(screen.getByRole('link', { name: 'Позвонить' }).getAttribute('href')).toBe(
      'tel:+33612345678',
    );
    expect(screen.getByRole('link', { name: 'WhatsApp' }).getAttribute('href')).toBe(
      'https://wa.me/33612345678',
    );
  });

  it('shows the localized country with its code', () => {
    renderRow();
    expect(screen.getByText('75001, Paris · Франция (FR)')).toBeTruthy();
  });

  it('keeps the country unknown for a legacy order', () => {
    renderRow(order({ country: null, postalCode: '', address: '' }));
    expect(screen.getByText('страна неизвестна')).toBeTruthy();
  });

  it('links the product to the catalog when it still exists', () => {
    renderRow(order(), { product: { id: 'p1', name: 'Tocador Aria', media: [] } });
    expect(screen.getByRole('link', { name: 'Tocador Aria' }).getAttribute('href')).toBe(
      '/admin/catalog?product=p1',
    );
  });
});

// The same lines the order notification carries (server/order.js): source,
// the ad within the campaign, the entry page, the device.
describe('OrderRow — where the order came from', () => {
  it('shows the ad and the entry page under the source', () => {
    renderRow(
      order({
        attributionLabel: 'Meta Ads · Instagram — «Tocadores Septiembre»',
        adDetail: 'ADS_Tocadores_25-45 · video_tocador_01 (Instagram_Reels)',
        entry: '/tocadores',
      }),
    );
    expect(screen.getByText('Fuente: Meta Ads · Instagram — «Tocadores Septiembre»')).toBeTruthy();
    expect(screen.getByText(/Anuncio: ADS_Tocadores_25-45/)).toBeTruthy();
    expect(screen.getByText(/Entrada: \/tocadores/)).toBeTruthy();
  });

  it('says nothing extra for an order with no campaign behind it', () => {
    renderRow();
    expect(screen.getByText('Fuente: Directo / desconocido')).toBeTruthy();
    expect(screen.queryByText(/Anuncio:/)).toBeNull();
  });

  it('shows the device on its own line, and none where it was never stored', () => {
    renderRow(order({ entry: '/tocadores', device: '📱 iPhone · Instagram (app)' }));
    expect(screen.getByText('Dispositivo: 📱 iPhone · Instagram (app)')).toBeTruthy();
    expect(screen.getByText('Entrada: /tocadores')).toBeTruthy();
  });
});

describe('OrderRow — the owner’s note', () => {
  const note = () => screen.getByRole('textbox', { name: 'Заметка к заявке от Ana' });

  it('saves on leaving the field', async () => {
    const { onUpdate } = renderRow();
    fireEvent.change(note(), { target: { value: 'перезвонить после 18:00' } });
    await act(async () => fireEvent.blur(note()));
    expect(onUpdate).toHaveBeenCalledWith({ note: 'перезвонить после 18:00' });
    expect(screen.getByText('Заметка сохранена')).toBeTruthy();
  });

  it('saves after a pause in typing, once', async () => {
    vi.useFakeTimers();
    const { onUpdate } = renderRow();
    fireEvent.change(note(), { target: { value: 'доставка' } });
    fireEvent.change(note(), { target: { value: 'доставка 22.10' } });
    await act(async () => vi.advanceTimersByTime(1500));
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith({ note: 'доставка 22.10' });
  });

  it('does not save a note that did not change', async () => {
    const { onUpdate } = renderRow(order({ note: 'уже есть' }));
    await act(async () => fireEvent.blur(note()));
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('says so when the note did not save', async () => {
    renderRow(order(), { onUpdate: vi.fn(async () => false) });
    fireEvent.change(note(), { target: { value: 'x' } });
    await act(async () => fireEvent.blur(note()));
    expect(screen.getByText('Не сохранилось — попробуйте ещё раз')).toBeTruthy();
  });
});

describe('OrderRow — removing', () => {
  it('deletes from its menu', () => {
    const { onRemove } = renderRow();
    fireEvent.click(screen.getByRole('button', { name: 'Действия с заявкой от Ana' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Удалить заявку' }));
    expect(onRemove).toHaveBeenCalled();
  });
});
