import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BlocksEditor from './BlocksEditor.jsx';

const open = () => fireEvent.click(screen.getByRole('button', { name: /Блоки главной/ }));

describe('BlocksEditor — «Избранное» по устройствам', () => {
  it('по умолчанию включено только на мобильных', () => {
    render(<BlocksEditor blocks={{}} onChange={() => {}} />);
    open();
    expect(screen.getByLabelText('На мобильных').checked).toBe(true);
    expect(screen.getByLabelText('На ПК').checked).toBe(false);
  });

  it('включает показ на ПК', () => {
    const onChange = vi.fn();
    render(<BlocksEditor blocks={{ featured: true }} onChange={onChange} />);
    open();
    fireEvent.click(screen.getByLabelText('На ПК'));
    expect(onChange).toHaveBeenCalledWith({ featured: true, featuredDesktop: true });
  });

  it('выключает показ на мобильных, не трогая ПК', () => {
    const onChange = vi.fn();
    render(<BlocksEditor blocks={{ featured: true, featuredDesktop: true }} onChange={onChange} />);
    open();
    fireEvent.click(screen.getByLabelText('На мобильных'));
    expect(onChange).toHaveBeenCalledWith({ featured: false, featuredDesktop: true });
  });

  it('считает раздел скрытым, только когда он выключен везде', () => {
    const { rerender } = render(
      <BlocksEditor blocks={{ featured: false, featuredDesktop: true }} onChange={() => {}} />,
    );
    expect(screen.getByText('все показаны')).toBeTruthy();
    rerender(<BlocksEditor blocks={{ featured: false, featuredDesktop: false }} onChange={() => {}} />);
    expect(screen.getByText('1 скрыто')).toBeTruthy();
  });
});
