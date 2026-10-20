import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Collapsible from './Collapsible.jsx';

describe('Collapsible', () => {
  it('is folded by default, showing what it holds', () => {
    render(
      <Collapsible title="Избранное" summary="2 карточки">
        <p>Внутри</p>
      </Collapsible>,
    );
    const toggle = screen.getByRole('button', { name: 'Избранное 2 карточки' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('Внутри')).toBeNull();
  });

  it('opens and closes, telling screen readers which', () => {
    render(
      <Collapsible title="Отзывы">
        <p>Внутри</p>
      </Collapsible>,
    );
    const toggle = screen.getByRole('button', { name: 'Отзывы' });
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Внутри')).toBeTruthy();
    fireEvent.click(toggle);
    expect(screen.queryByText('Внутри')).toBeNull();
  });

  it('titles its block as a heading', () => {
    render(<Collapsible title="Главный экран" defaultOpen />);
    expect(screen.getByRole('heading', { level: 2, name: 'Главный экран' })).toBeTruthy();
  });
});
