import { useState } from 'react';
import { uploadVideo } from '../api.js';
import { INPUT, LABEL, BTN_GHOST } from '../ui.js';

export default function VideoField({ label, value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const { url } = await uploadVideo(file);
      onChange(url);
    } catch (err) {
      setError(err.message || 'Ошибка загрузки');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {label && <span className={LABEL}>{label}</span>}
      <div className="mt-1 flex flex-wrap items-start gap-4">
        {value && (
          <div className="shrink-0">
            <div className="w-24 overflow-hidden border border-primary/15 bg-surface" style={{ aspectRatio: '16/9' }}>
              <video src={value} className="h-full w-full object-cover" muted />
            </div>
            <p className="mt-1 text-center text-[10px] uppercase tracking-[0.12em] text-primary/35">Видео</p>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <input
            className={INPUT}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="/uploads/... или внешний URL"
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label className={`${BTN_GHOST} cursor-pointer`}>
              {busy ? 'Загрузка…' : 'Загрузить видео'}
              <input type="file" accept="video/*" className="hidden" onChange={onFile} disabled={busy} />
            </label>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="text-xs uppercase tracking-[0.18em] text-red-600 hover:underline"
              >
                Удалить
              </button>
            )}
            {error && <span className="text-xs text-red-600">{error}</span>}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-primary/40">
            MP4, WebM, MOV. Макс. 200 МБ. Большие файлы грузятся несколько минут.
          </p>
        </div>
      </div>
    </div>
  );
}
