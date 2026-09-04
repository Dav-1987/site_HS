import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Field } from './Field.jsx';

// Браузер считает колесо мыши над сфокусированным number-полем командой
// «прибавь/убавь»: прокрутка страницы мимо цены молча меняла цену товара.
describe('Field — колесо мыши', () => {
  it('снимает фокус с числового поля, чтобы прокрутка не правила цифры', () => {
    render(<Field label="Цена (€)" type="number" value={489} onChange={vi.fn()} />);
    const input = screen.getByLabelText('Цена (€)');
    input.focus();
    expect(document.activeElement).toBe(input);

    fireEvent.wheel(input);
    expect(document.activeElement).not.toBe(input);
  });

  it('не трогает фокус в обычном текстовом поле — там колесо и так безобидно', () => {
    render(<Field label="Размер" value="90 × 40 × 170 cm" onChange={vi.fn()} />);
    const input = screen.getByLabelText('Размер');
    input.focus();

    fireEvent.wheel(input);
    expect(document.activeElement).toBe(input);
  });

  it('прокрутка не доходит до onChange', () => {
    const onChange = vi.fn();
    render(<Field label="Цена (€)" type="number" value={489} onChange={onChange} />);
    const input = screen.getByLabelText('Цена (€)');
    input.focus();

    fireEvent.wheel(input, { deltaY: -100 });
    expect(onChange).not.toHaveBeenCalled();
  });
});
