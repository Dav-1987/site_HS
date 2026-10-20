import { useState } from 'react';
import ChangePasswordForm from './ChangePasswordForm.jsx';
import Collapsible from './Collapsible.jsx';

/**
 * «Пароль администратора» in «Настройки» — it used to be reachable only from
 * the login screen, that is, only after signing out. Saved by its own button,
 * at once, like an order's status: it is not part of the settings «Сохранить»
 * sends.
 */
export default function PasswordSettings() {
  const [changed, setChanged] = useState(false);
  return (
    <Collapsible title="Пароль администратора" summary={changed ? 'изменён' : 'сменить'}>
      <p className="max-w-2xl text-xs leading-relaxed text-primary/75">
        Новый пароль начинает действовать сразу — кнопка «Сохранить» для этого не нужна. Там, где вы
        уже вошли, админка останется открытой: вход действует 7 дней или до «Выйти».
      </p>
      {changed && (
        <p role="status" className="text-sm text-primary">
          Пароль изменён. При следующем входе понадобится новый.
        </p>
      )}
      <div className="max-w-sm">
        <ChangePasswordForm onSuccess={() => setChanged(true)} />
      </div>
    </Collapsible>
  );
}
