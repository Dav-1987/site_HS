import { useState } from 'react';
import { changePassword as apiChangePassword } from '../api.js';
import { MIN_PASSWORD_LENGTH as MIN_LENGTH, passwordErrorText } from '../passwordErrors.js';
import { BTN_SOLID } from '../ui.js';
import { Field } from './Field.jsx';

/**
 * Current password, a new one twice, and «Сменить пароль». On the login screen
 * (signed out) and in «Настройки» (signed in) — the same check either way: the
 * server takes the new password only with the current one.
 *
 * `onSuccess` runs once the server took it; `onCancel`, if given, adds a link
 * back. `wide` stretches the button across a narrow card.
 */
export default function ChangePasswordForm({ onSuccess, onCancel, wide = false, autoFocus }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (next.length < MIN_LENGTH) {
      setError(`Новый пароль должен быть не короче ${MIN_LENGTH} символов`);
      return;
    }
    if (next !== confirm) {
      setError('Пароли не совпадают');
      return;
    }
    setBusy(true);
    try {
      await apiChangePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      onSuccess();
    } catch (err) {
      setError(passwordErrorText(err.message, 'Не удалось сменить пароль'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="space-y-4">
        <Field
          label="Текущий пароль"
          type="password"
          value={current}
          onChange={setCurrent}
          autoComplete="current-password"
          autoFocus={autoFocus}
        />
        <Field
          label="Новый пароль"
          type="password"
          value={next}
          onChange={setNext}
          autoComplete="new-password"
        />
        <Field
          label="Повторите новый пароль"
          type="password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
        />
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className={`${BTN_SOLID} ${wide ? 'mt-8 w-full justify-center' : 'mt-6'}`}
      >
        {busy ? 'Сохранение…' : 'Сменить пароль'}
      </button>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-4 w-full text-center text-xs text-primary/75 underline-offset-2 hover:text-accent-text hover:underline"
        >
          Назад ко входу
        </button>
      )}
    </form>
  );
}
