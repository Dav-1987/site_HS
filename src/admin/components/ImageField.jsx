import { useState } from 'react';
import { resolveImage } from '../../data/catalog.js';
import { uploadImage } from '../api.js';
import { INPUT, LABEL, BTN_GHOST } from '../ui.js';

// One crop frame: shows exactly how the image is cropped (object-cover) for a
// given aspect ratio used somewhere on the site.
function CropPreview({ src, ratio, caption }) {
  return (
    <div className="shrink-0">
      <div
        className="w-24 overflow-hidden border border-primary/15 bg-surface"
        style={{ aspectRatio: ratio }}
      >
        {src ? (
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-serif text-xl font-light text-primary/20">HS</span>
          </div>
        )}
      </div>
      <p className="mt-1 text-center text-[10px] uppercase tracking-[0.12em] text-primary/35">
        {caption}
      </p>
    </div>
  );
}

export default function ImageField({ label, value, onChange, frames = [['4 / 5', 'Карточка 4:5']] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const preview = resolveImage(value, 320);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const { url } = await uploadImage(file);
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
        {/* Crop previews — same object-cover the site uses, one per aspect ratio */}
        <div className="flex gap-3">
          {frames.map(([ratio, caption]) => (
            <CropPreview key={caption} src={preview} ratio={ratio} caption={caption} />
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <input
            className={INPUT}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Unsplash ID, URL или /api/image/…"
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label className={`${BTN_GHOST} cursor-pointer`}>
              {busy ? 'Загрузка…' : 'Загрузить изображение'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFile}
                disabled={busy}
              />
            </label>
            {error && <span className="text-xs text-red-600">{error}</span>}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-primary/40">
            На витрине фото обрезается по этим рамкам (по центру). Держите главный
            объект в центре кадра.
          </p>
        </div>
      </div>
    </div>
  );
}
