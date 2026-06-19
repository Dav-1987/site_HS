import { useState } from 'react';
import { resolveImage } from '../../data/catalog.js';
import { uploadImage, uploadVideo } from '../api.js';
import { INPUT, LABEL, BTN_GHOST } from '../ui.js';

// A single image/video upload slot with thumbnail preview, used for a card's
// cover (image) and its video.
function UploadSlot({ kind, src, onUploaded, label }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const upload = kind === 'video' ? uploadVideo : uploadImage;

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const { url } = await upload(file);
      onUploaded(url);
    } catch (err) {
      setError(err.message || 'Ошибка загрузки');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <span className={LABEL}>{label}</span>
      <div className="mt-1 flex items-center gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden border border-primary/10 bg-surface">
          {src ? (
            kind === 'video' ? (
              <video src={src} muted playsInline className="h-full w-full object-cover" />
            ) : (
              <img src={resolveImage(src, 200)} alt="" className="h-full w-full object-cover" />
            )
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-primary/25">—</div>
          )}
        </div>
        <label className={`${BTN_GHOST} cursor-pointer`}>
          {busy ? '…' : src ? 'Заменить' : 'Загрузить'}
          <input
            type="file"
            accept={kind === 'video' ? 'video/*' : 'image/*'}
            className="hidden"
            disabled={busy}
            onChange={onPick}
          />
        </label>
        {src && (
          <button
            type="button"
            onClick={() => onUploaded('')}
            className="text-xs uppercase tracking-[0.18em] text-red-600 hover:underline"
          >
            Убрать
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// Editor for the home "Featured pieces" section: an ordered list of cards, each
// linking to a product (name + price shown on the card) with an optional cover
// image and video. Empty → the home page auto-curates the section instead.
export default function FeaturedCardsEditor({ value, onChange, allProducts }) {
  const [open, setOpen] = useState(false);
  const cards = Array.isArray(value) ? value : [];

  const update = (i, patch) => onChange(cards.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const remove = (i) => {
    if (window.confirm('Удалить карточку?')) onChange(cards.filter((_, j) => j !== i));
  };
  const move = (i, d) => {
    const t = i + d;
    if (t < 0 || t >= cards.length) return;
    const next = [...cards];
    [next[i], next[t]] = [next[t], next[i]];
    onChange(next);
  };
  const add = () => onChange([...cards, { productId: '', cover: '', video: '' }]);

  // "Name · ARTÍCULO · Category" so products that share a name (e.g. "Tocador")
  // can be told apart by their reference (артикул) in the dropdown.
  const optionLabel = (p) =>
    [p.name, p.reference, p.categoryName].filter(Boolean).join(' · ');
  const labelOf = (id) => {
    const p = allProducts.find((x) => x.id === id);
    return p ? optionLabel(p) : `${id} (удалён?)`;
  };

  return (
    <div className="border border-primary/15 bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <span className={`text-base transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
        <span className="font-serif text-xl font-light text-primary">Избранное</span>
        <span className="text-xs uppercase tracking-[0.18em] text-primary/40">Featured pieces</span>
        {cards.length > 0 && <span className="text-xs text-primary/35">· {cards.length}</span>}
      </button>
      {open && (
        <div className="space-y-4 border-t border-primary/10 px-5 py-6">
          <p className="text-xs leading-relaxed text-primary/45">
            Карточки блока «Featured pieces» на главной. Каждая ведёт на выбранный товар и
            показывает его название и цену. Обложка видна всегда; видео проигрывается при
            наведении курсора (ПК) или когда карточка полностью видна (моб.). Клик/тап — переход
            на товар. Пусто — подборка формируется автоматически.
          </p>

          {cards.map((card, i) => {
            // Hide products already used by other cards, but keep this card's own pick visible.
            const available = allProducts.filter(
              (p) => p.id === card.productId || !cards.some((c) => c.productId === p.id),
            );
            return (
              <div key={i} className="space-y-3 border border-primary/10 bg-background p-4">
                <div className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-[11px] text-primary/35">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-primary">
                    {card.productId ? labelOf(card.productId) : 'Товар не выбран'}
                  </span>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className={BTN_GHOST}>
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === cards.length - 1}
                    className={BTN_GHOST}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    aria-label="Удалить карточку"
                    className="text-xs uppercase tracking-[0.18em] text-red-600 hover:underline"
                  >
                    ×
                  </button>
                </div>

                <div>
                  <span className={LABEL}>Товар (ссылка, название и цена)</span>
                  <select
                    className={INPUT}
                    value={card.productId}
                    onChange={(e) => update(i, { productId: e.target.value })}
                  >
                    <option value="">— выберите товар —</option>
                    {available.map((p) => (
                      <option key={p.id} value={p.id}>
                        {optionLabel(p)}
                      </option>
                    ))}
                  </select>
                  {!card.productId && (
                    <p className="mt-1 text-xs text-accent">Без товара карточка не покажется на сайте.</p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <UploadSlot
                    kind="image"
                    src={card.cover}
                    onUploaded={(url) => update(i, { cover: url })}
                    label="Обложка (пусто — первое фото товара)"
                  />
                  <UploadSlot
                    kind="video"
                    src={card.video}
                    onUploaded={(url) => update(i, { video: url })}
                    label="Видео (необязательно)"
                  />
                </div>
              </div>
            );
          })}

          <button type="button" onClick={add} className={`${BTN_GHOST} w-full justify-center py-3`}>
            + Добавить карточку
          </button>
        </div>
      )}
    </div>
  );
}
