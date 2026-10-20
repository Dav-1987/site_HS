import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { applyUpdate } from '../update.js';
import ContactEditor from './ContactEditor.jsx';

describe('ContactEditor', () => {
  const contact = { phone: '614848301', email: 'info@hsmuebles.es' };

  it('counts the channels that show in the footer', () => {
    render(<ContactEditor contact={contact} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /2 из 5 в подвале/ })).toBeTruthy();
  });

  it('labels each field, and writes it into the contacts as they are', () => {
    const onChange = vi.fn();
    render(<ContactEditor contact={contact} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Контакты и соцсети/ }));
    fireEvent.change(screen.getByLabelText('Instagram (URL)'), {
      target: { value: 'https://www.instagram.com/mirage_muebles' },
    });
    expect(applyUpdate(onChange.mock.calls[0][0], contact)).toEqual({
      ...contact,
      instagram: 'https://www.instagram.com/mirage_muebles',
    });
  });
});
