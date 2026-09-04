import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Section from './Section.jsx';

const body = () => screen.queryByText('содержимое');

describe('Section', () => {
  it('свёрнута по умолчанию — карточка открывается списком заголовков', () => {
    render(<Section title="Цена">содержимое</Section>);
    expect(screen.getByRole('button', { name: /Цена/ })).toBeTruthy();
    expect(body()).toBeNull();
  });

  it('раскрывается и сворачивается по клику', () => {
    render(<Section title="Цена">содержимое</Section>);
    const header = screen.getByRole('button', { name: /Цена/ });
    fireEvent.click(header);
    expect(body()).toBeTruthy();
    fireEvent.click(header);
    expect(body()).toBeNull();
  });

  it('открыта сразу, когда группа — то, за чем в карточку и заходят', () => {
    render(
      <Section title="Товары" defaultOpen>
        содержимое
      </Section>,
    );
    expect(body()).toBeTruthy();
  });

  it('показывает сводку в заголовке, чтобы не открывать группу ради взгляда', () => {
    render(
      <Section title="Цена" hint="€489">
        содержимое
      </Section>,
    );
    expect(screen.getByRole('button', { name: /Цена.*€489/ })).toBeTruthy();
  });

  it('сообщает своё состояние программам чтения с экрана', () => {
    render(<Section title="Цена">содержимое</Section>);
    const header = screen.getByRole('button', { name: /Цена/ });
    expect(header.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(header);
    expect(header.getAttribute('aria-expanded')).toBe('true');
  });
});
