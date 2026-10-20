import { useState } from 'react';
import { login as apiLogin } from '../api.js';
import { passwordErrorText } from '../passwordErrors.js';
import { BTN_SOLID } from '../ui.js';
import ChangePasswordForm from './ChangePasswordForm.jsx';
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
      setError(passwordErrorText(err.message, 'Ошибка входа'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <Field label="Пароль" type="password" value={password} onChange={setPassword} autoFocus />
      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      <button type="submit" disabled={busy} className={`${BTN_SOLID} mt-8 w-full justify-center`}>
        {busy ? 'Вход…' : 'Войти'}
      </button>
      <button
        type="button"
        onClick={onWantChange}
        className="mt-4 w-full text-center text-xs text-primary/75 underline-offset-2 hover:text-accent-text hover:underline"
      >
        Сменить пароль
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
          <ChangePasswordForm
            onSuccess={onSuccess}
            onCancel={() => setMode('login')}
            wide
            autoFocus
          />
        )}
      </div>
    </div>
  );
}
