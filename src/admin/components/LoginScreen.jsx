import { useState } from 'react';
import { login as apiLogin, changePassword as apiChangePassword } from '../api.js';
import { BTN_SOLID } from '../ui.js';
import { Field } from './Field.jsx';

function LoginForm({ onSuccess, onWantChange }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await apiLogin(password);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Ошибка входа');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <Field label="Пароль" type="password" value={password} onChange={setPassword} autoFocus />
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className={`${BTN_SOLID} mt-8 w-full justify-center`}>
        {busy ? 'Вход…' : 'Войти'}
      </button>
      <button
        type="button"
        onClick={onWantChange}
        className="mt-4 w-full text-center text-xs text-primary/60 underline-offset-2 hover:text-accent-text hover:underline"
      >
        Сменить пароль
      </button>
    </form>
  );
}

function ChangePasswordForm({ onSuccess, onCancel }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (next.length < 8) {
      setError('Новый пароль должен быть не короче 8 символов');
      return;
    }
    if (next !== confirm) {
      setError('Пароли не совпадают');
      return;
    }
    setBusy(true);
    try {
      await apiChangePassword(current, next);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Не удалось сменить пароль');
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
          autoFocus
        />
        <Field label="Новый пароль" type="password" value={next} onChange={setNext} />
        <Field
          label="Повторите новый пароль"
          type="password"
          value={confirm}
          onChange={setConfirm}
        />
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className={`${BTN_SOLID} mt-8 w-full justify-center`}>
        {busy ? 'Сохранение…' : 'Сменить пароль'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="mt-4 w-full text-center text-xs text-primary/60 underline-offset-2 hover:text-accent-text hover:underline"
      >
        Назад ко входу
      </button>
    </form>
  );
}

export default function LoginScreen({ onSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'change'

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-6">
      <div className="w-full max-w-sm border border-primary/10 bg-background p-10">
        <p className="mb-2 text-xs uppercase tracking-[0.3em] text-accent-text">Mirage Muebles</p>
        <h1 className="mb-8 font-serif text-3xl font-light text-primary">
          {mode === 'login' ? 'Панель управления' : 'Смена пароля'}
        </h1>
        {mode === 'login' ? (
          <LoginForm onSuccess={onSuccess} onWantChange={() => setMode('change')} />
        ) : (
          <ChangePasswordForm onSuccess={onSuccess} onCancel={() => setMode('login')} />
        )}
      </div>
    </div>
  );
}
