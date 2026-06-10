import { useState } from 'react';
import { login as apiLogin } from '../api.js';
import { BTN_SOLID } from '../ui.js';
import { Field } from './Field.jsx';

export default function LoginScreen({ onSuccess }) {
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
    <div className="flex min-h-screen items-center justify-center bg-surface px-6">
      <form onSubmit={submit} className="w-full max-w-sm border border-primary/10 bg-background p-10">
        <p className="mb-2 text-xs uppercase tracking-[0.3em] text-accent">HS Muebles</p>
        <h1 className="mb-8 font-serif text-3xl font-light text-primary">Панель управления</h1>
        <Field
          label="Пароль"
          type="password"
          value={password}
          onChange={setPassword}
          autoFocus
        />
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className={`${BTN_SOLID} mt-8 w-full justify-center`}>
          {busy ? 'Вход…' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
