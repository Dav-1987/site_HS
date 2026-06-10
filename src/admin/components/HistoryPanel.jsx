import { useEffect, useState } from 'react';
import { listVersions as apiListVersions, restoreVersion as apiRestoreVersion } from '../api.js';
import { BTN_GHOST } from '../ui.js';

export default function HistoryPanel({ onClose, onRestored }) {
  const [versions, setVersions] = useState(null);
  const [error, setError] = useState('');
  const [restoringId, setRestoringId] = useState(null);

  useEffect(() => {
    apiListVersions()
      .then((d) => setVersions(d.versions))
      .catch((e) => setError(e.message || 'Не удалось загрузить историю'));
  }, []);

  const restore = async (id) => {
    if (
      !window.confirm(
        'Восстановить эту версию каталога? Текущее состояние будет заменено (и тоже сохранится в истории).',
      )
    )
      return;
    setRestoringId(id);
    setError('');
    try {
      const data = await apiRestoreVersion(id);
      onRestored(data.categories);
    } catch (e) {
      setError(e.message || 'Ошибка восстановления');
      setRestoringId(null);
    }
  };

  const fmt = (iso) =>
    new Date(iso).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-primary/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-background p-6 shadow-floating"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-light text-primary">История изменений</h2>
          <button type="button" onClick={onClose} className={BTN_GHOST}>
            Закрыть
          </button>
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {!versions && !error && <p className="text-primary/50">Загрузка…</p>}
        {versions && versions.length === 0 && (
          <p className="text-primary/50">Пока нет сохранённых версий.</p>
        )}

        <ul className="space-y-3">
          {versions?.map((v, i) => (
            <li
              key={v.id}
              className="flex items-center gap-3 border border-primary/10 bg-surface px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-primary">
                  {fmt(v.createdAt)}
                  {i === 0 && (
                    <span className="ml-2 text-[10px] uppercase tracking-[0.15em] text-accent">
                      текущая
                    </span>
                  )}
                </p>
                <p className="text-xs text-primary/45">
                  {v.categoryCount} катег. · {v.productCount} товаров
                </p>
              </div>
              <button
                type="button"
                disabled={i === 0 || restoringId === v.id}
                onClick={() => restore(v.id)}
                className={BTN_GHOST}
              >
                {restoringId === v.id ? 'Восстановление…' : 'Восстановить'}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
