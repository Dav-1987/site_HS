import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as api from '../api.js';
import ChangePasswordForm from './ChangePasswordForm.jsx';
import PasswordSettings from './PasswordSettings.jsx';

vi.mock('../api.js', () => ({ changePassword: vi.fn() }));

const type = (label, value) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const fill = (current, next, again = next) => {
  type('Текущий пароль', current);
  type('Новый пароль', next);
  type('Повторите новый пароль', again);
};
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Сменить пароль' }));

beforeEach(() => {
  vi.mocked(api.changePassword).mockReset().mockResolvedValue({ ok: true });
});

describe('ChangePasswordForm', () => {
  it('sends the current and the new password, then clears the fields', async () => {
    const onSuccess = vi.fn();
    render(<ChangePasswordForm onSuccess={onSuccess} />);
    fill('old-secret', 'new-secret-1');
    submit();
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(api.changePassword).toHaveBeenCalledWith('old-secret', 'new-secret-1');
    expect(screen.getByLabelText('Новый пароль').value).toBe('');
  });

  it('refuses a new password under 8 characters without asking the server', () => {
    render(<ChangePasswordForm onSuccess={() => {}} />);
    fill('old-secret', 'short');
    submit();
    expect(screen.getByRole('alert').textContent).toBe(
      'Новый пароль должен быть не короче 8 символов',
    );
    expect(api.changePassword).not.toHaveBeenCalled();
  });

  it('refuses two different new passwords without asking the server', () => {
    render(<ChangePasswordForm onSuccess={() => {}} />);
    fill('old-secret', 'new-secret-1', 'new-secret-2');
    submit();
    expect(screen.getByRole('alert').textContent).toBe('Пароли не совпадают');
    expect(api.changePassword).not.toHaveBeenCalled();
  });

  it('says in Russian that the current password is wrong', async () => {
    vi.mocked(api.changePassword).mockRejectedValue(new Error('Incorrect current password'));
    const onSuccess = vi.fn();
    render(<ChangePasswordForm onSuccess={onSuccess} />);
    fill('wrong', 'new-secret-1');
    submit();
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe('Текущий пароль введён неверно'),
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('shows an error it has no translation for as it came', async () => {
    vi.mocked(api.changePassword).mockRejectedValue(new Error('Ошибка запроса (502)'));
    render(<ChangePasswordForm onSuccess={() => {}} />);
    fill('old-secret', 'new-secret-1');
    submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Ошибка запроса (502)'));
  });

  it('lets a password manager tell the fields apart', () => {
    render(<ChangePasswordForm onSuccess={() => {}} />);
    expect(screen.getByLabelText('Текущий пароль').autocomplete).toBe('current-password');
    expect(screen.getByLabelText('Новый пароль').autocomplete).toBe('new-password');
  });

  it('offers the way back only where there is one', () => {
    const { rerender } = render(<ChangePasswordForm onSuccess={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Назад ко входу' })).toBeNull();
    const onCancel = vi.fn();
    rerender(<ChangePasswordForm onSuccess={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Назад ко входу' }));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('PasswordSettings', () => {
  it('says the password was changed, in the fold and under it', async () => {
    render(<PasswordSettings />);
    const fold = screen.getByRole('button', { name: /Пароль администратора/ });
    expect(fold.textContent).toContain('сменить');
    fireEvent.click(fold);
    fill('old-secret', 'new-secret-1');
    submit();
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Пароль изменён/));
    expect(fold.textContent).toContain('изменён');
  });
});
