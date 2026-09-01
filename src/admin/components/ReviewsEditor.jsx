import { useState } from 'react';
import { resolveImage } from '../../data/catalog.js';
import { posterFor } from '../../data/settings.js';
import { uploadReviewImage, uploadVideo } from '../api.js';
import { LABEL, BTN_GHOST, BTN_SOLID } from '../ui.js';

/** Требования к скриншоту — показываем прямо в форме, а не в переписке. */
const SIZE_HINT = '1080 × 1350 px (4:5), PNG';

/**
 * Редактор стены отзывов: скриншоты переписок и ролики клиентов.
 *
 * Никаких оценок, подписей и привязки к товару — отзыв это сам скриншот.
 * Порядок задаётся стрелками и он же определяет, что попадёт в ленту на
 * главной (первые восемь).
 */
export default function ReviewsEditor({ reviews = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const add = async (files, kind) => {
    if (!files.length) return;
    setBusy(true);
    setError('');
    const added = [];
    try {
      for (const file of files) {
        const { url } = kind === 'video' ? await uploadVideo(file) : await uploadReviewImage(file);
        added.push(kind === 'video' ? { video: url } : { image: url });
      }
      onChange([...reviews, ...added]);
    } catch (err) {
      // Часть пачки могла загрузиться до сбоя — сохраняем то, что успели,
      // иначе владелец потеряет уже залитые файлы и зальёт их повторно.
      if (added.length) onChange([...reviews, ...added]);
      setError(err.message || 'Ошибка загрузки');
    } finally {
      setBusy(false);
    }
  };

  const move = (from, to) => {
    if (to < 0 || to >= reviews.length) return;
    const next = [...reviews];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const remove = (i) => {
    if (window.confirm('Удалить отзыв?')) onChange(reviews.filter((_, idx) => idx !== i));
  };

  return (
    <div className="border border-primary/15 bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <span className={`text-base transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
        <span className="font-serif text-xl font-light text-primary">Отзывы</span>
        <span className="text-xs uppercase tracking-[0.18em] text-primary/40">
          {reviews.length ? `${reviews.length} шт.` : 'пусто'}
        </span>
      </button>

      {!open ? null : (
        <div className="border-t border-primary/10 px-5 py-6">
          <div className="flex flex-wrap items-center gap-3">
            <label className={`${BTN_SOLID} cursor-pointer`}>
              {busy ? 'Загрузка…' : 'Добавить скриншоты'}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  const files = [...e.target.files];
                  e.target.value = '';
                  add(files, 'image');
                }}
              />
            </label>

            <label className={`${BTN_GHOST} cursor-pointer`}>
              Добавить видео
              <input
                type="file"
                accept="video/*"
                multiple
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  const files = [...e.target.files];
                  e.target.value = '';
                  add(files, 'video');
                }}
              />
            </label>

            <span className="text-xs text-primary/45">{reviews.length} шт.</span>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-primary/50">
            Размер скриншота — <b className="text-primary/70">{SIZE_HINT}</b>. Все картинки должны
            быть одной пропорции, иначе сетка поедет. Кадрируйте плотно: 3–4 сообщения в кадре
            читаются, а переписка на десять реплик на телефоне превратится в нечитаемую мелочь.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-primary/50">
            Перед загрузкой обрежьте шапку чата с номером телефона и аватаркой — это персональные
            данные клиента. Постер для видео сервер возьмёт сам при пересборке сайта.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-primary/50">
            Порядок задаётся стрелками. Первые 8 попадают в ленту на главной.
          </p>

          {error && <p className="mt-3 text-xs text-danger">{error}</p>}

          {reviews.length > 0 && (
            <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {reviews.map((review, i) => (
                <li key={review.video || review.image} className="border border-primary/10 p-2">
                  <div className="relative aspect-[4/5] overflow-hidden bg-surface">
                    {review.video ? (
                      <video
                        src={review.video}
                        poster={resolveImage(posterFor(review.video), 400) || undefined}
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <img
                        src={resolveImage(review.image, 400)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                    {review.video && (
                      <span className="absolute left-1 top-1 bg-primary/70 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] text-background">
                        видео
                      </span>
                    )}
                    {i < 8 && (
                      <span className="absolute right-1 top-1 bg-accent px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] text-primary">
                        главная
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className={BTN_GHOST}
                        disabled={i === 0}
                        aria-label="Переместить влево"
                        onClick={() => move(i, i - 1)}
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        className={BTN_GHOST}
                        disabled={i === reviews.length - 1}
                        aria-label="Переместить вправо"
                        onClick={() => move(i, i + 1)}
                      >
                        →
                      </button>
                    </div>
                    <button
                      type="button"
                      className="text-[11px] uppercase tracking-[0.18em] text-danger/70 transition-colors hover:text-danger"
                      onClick={() => remove(i)}
                    >
                      Удалить
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {reviews.length === 0 && <p className={`${LABEL} mt-6`}>Пока ни одного отзыва</p>}
        </div>
      )}
    </div>
  );
}
