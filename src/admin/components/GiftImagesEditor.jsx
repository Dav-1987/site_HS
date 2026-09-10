import { useState } from 'react';
import { resolveImage } from '../../data/catalog.js';
import { uploadImage } from '../api.js';
import { LABEL, BTN_GHOST, BTN_ICON } from '../ui.js';
import { IMAGE_SPECS, imageSpecText } from '../imageSpecs.js';

/**
 * The photos of a gift the shop does not sell as a product.
 *
 * A plain ordered list of image URLs, which is the whole difference from
 * ProductImagesEditor: that one carries videos, a catalog cover and drag-to-
 * reorder because a product's gallery is the page. A gift has neither page nor
 * video, and its first photo is simply the one the inset shows, so the same
 * component here would be four controls the shop never has a reason to touch.
 *
 * Reorder is by one step in either direction rather than by dragging: it is the
 * only thing that works on a phone (HTML5 drag events never fire there), and
 * with a handful of photos it is also faster than aiming a drop.
 */
export default function GiftImagesEditor({ value, onChange }) {
  const items = Array.isArray(value) ? value : [];
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [errors, setErrors] = useState([]);

  const move = (i, dir) => {
    const target = i + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[i], next[target]] = [next[target], next[i]];
    onChange(next);
  };

  const remove = (i) => {
    if (!window.confirm('Удалить это фото подарка?')) return;
    onChange(items.filter((_, j) => j !== i));
  };

  const onAdd = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // let the same file be picked again after an error
    if (!files.length) return;
    setBusy(true);
    setProgress(`0 / ${files.length}`);
    setErrors([]);
    const added = [];
    const errs = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const { url } = await uploadImage(files[i]);
        added.push(url);
      } catch (err) {
        errs.push(`${files[i].name}: ${err.message || 'Ошибка загрузки'}`);
      }
      setProgress(`${i + 1} / ${files.length}`);
    }
    setBusy(false);
    setProgress('');
    setErrors(errs);
    // Whatever did upload is kept even when the rest failed: re-picking two
    // files because the third was too big is a poor trade for the shop.
    if (added.length) onChange([...items, ...added]);
  };

  return (
    <div>
      <span className={LABEL}>Фото подарка</span>
      <div className="mt-2 flex flex-wrap gap-3">
        {items.map((src, i) => (
          <div key={`${src}-${i}`} className="w-28">
            <div className="relative aspect-[4/5] overflow-hidden border border-primary/15 bg-surface">
              <img src={resolveImage(src, 320)} alt="" className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-0 top-0 bg-primary/80 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-background">
                  В уголке
                </span>
              )}
            </div>
            <div className="mt-1 flex gap-1">
              <button
                type="button"
                className={BTN_ICON}
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Сдвинуть фото левее"
              >
                ←
              </button>
              <button
                type="button"
                className={BTN_ICON}
                onClick={() => move(i, 1)}
                disabled={i === items.length - 1}
                aria-label="Сдвинуть фото правее"
              >
                →
              </button>
              <button
                type="button"
                className={BTN_ICON}
                onClick={() => remove(i)}
                aria-label="Удалить фото"
              >
                ×
              </button>
            </div>
          </div>
        ))}

        <label
          className={`${BTN_GHOST} h-auto w-28 cursor-pointer flex-col gap-1 self-start py-6 text-center`}
        >
          <span aria-hidden="true" className="text-lg">
            +
          </span>
          <span className="normal-case tracking-normal">
            {busy ? progress || 'Загрузка…' : 'Добавить'}
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={busy}
            onChange={onAdd}
          />
        </label>
      </div>

      {errors.length > 0 && (
        <ul className="mt-2 space-y-1">
          {errors.map((msg) => (
            <li key={msg} className="text-xs text-red-600">
              {msg}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-xs leading-relaxed text-primary/40">
        {imageSpecText(IMAGE_SPECS.card)} Первое фото показывается маленькой врезкой в углу
        фотографии товара, остальные — во всплывающем окне, когда по врезке кликнут. Без единого
        фото врезки не будет: останется только строчка под ценой, и открывать будет нечего.
      </p>
    </div>
  );
}
