import { useState } from 'react';
import { resolveImage } from '../../data/catalog.js';
import { uploadImage, uploadVideo } from '../api.js';
import { INPUT, LABEL, BTN_GHOST } from '../ui.js';
import { productOptionLabel } from '../productLabel.js';
import { IMAGE_SPECS, imageSpecText } from '../imageSpecs.js';
import { updateAt } from '../update.js';
import { countLabel } from '../plural.js';
import Collapsible from './Collapsible.jsx';

// A single image/video upload slot with thumbnail preview, used for a card's
// cover (image) and its video.
function UploadSlot({ kind, src, onUploaded, label, spec }) {
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
            <div className="flex h-full w-full items-center justify-center text-[11px] text-primary/75">
              —
            </div>
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
            className="text-xs uppercase tracking-[0.18em] text-danger hover:underline"
          >
            Убрать
          </button>
        )}
      </div>
      {spec && (
        <p className="mt-1 text-xs leading-relaxed text-primary/75">{imageSpecText(spec)}</p>
      )}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

// Editor for the home "Featured pieces" section: an ordered list of cards, each
// linking to a product (name + price shown on the card) with an optional cover
// image and video. Empty → the home page auto-curates the section instead.
export default function FeaturedCardsEditor({ value, onChange, allProducts }) {
  const cards = Array.isArray(value) ? value : [];

  // Into the cards as they are when the change lands — a cover or a video
  // uploads for seconds, and the card may have been moved meanwhile, so it is
  // found by its product as well as its place (see ../update.js).
  const update = (i, patch) => {
    const productId = cards[i]?.productId;
    onChange((current) =>
      updateAt(
        Array.isArray(current) ? current : [],
        i,
        (c) => c.productId === productId,
        (c) => ({ ...c, ...patch }),
      ),
    );
  };
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

  const optionLabel = productOptionLabel;
  const labelOf = (id) => {
    const p = allProducts.find((x) => x.id === id);
    return p ? optionLabel(p) : `${id} (удалён?)`;
  };

  return (
    <Collapsible
      title="Избранное"
      summary={
        cards.length
          ? countLabel(cards.length, ['карточка', 'карточки', 'карточек'])
          : 'подбирается автоматически'
      }
    >
      <p className="text-xs leading-relaxed text-primary/75">
        Карточки блока «Featured pieces» на главной. Каждая ведёт на выбранный товар и показывает
        его название и цену. Обложка видна всегда; видео проигрывается при наведении курсора (ПК)
        или когда карточка полностью видна (моб.). Клик/тап — переход на товар. Пусто — подборка
        формируется автоматически.
      </p>

      {cards.map((card, i) => {
        // Hide products already used by other cards, but keep this card's own pick visible.
        const available = allProducts.filter(
          (p) => p.id === card.productId || !cards.some((c) => c.productId === p.id),
        );
        return (
          <div key={i} className="space-y-3 border border-primary/10 bg-background p-4">
            <div className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-[11px] text-primary/75">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-primary">
                {card.productId ? labelOf(card.productId) : 'Товар не выбран'}
              </span>
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className={BTN_GHOST}
              >
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
                className="text-xs uppercase tracking-[0.18em] text-danger hover:underline"
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
                <p className="mt-1 text-xs text-accent-text">
                  Без товара карточка не покажется на сайте.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <UploadSlot
                kind="image"
                src={card.cover}
                onUploaded={(url) => update(i, { cover: url })}
                label="Обложка (пусто — первое фото товара)"
                spec={IMAGE_SPECS.card}
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
    </Collapsible>
  );
}
