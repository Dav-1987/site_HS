import { useEffect, useRef, useState } from 'react';
import { copyText } from '../clipboard.js';
import { downloadPhotosZip, wallapopMediaUrl } from '../downloadPhotos.js';
import StatusControl from './StatusControl.jsx';

const WALLAPOP_SELL_URL = 'https://es.wallapop.com/app/sell';
const ACTION =
  'touch-target inline-flex items-center justify-center border border-primary/15 px-3 py-2 text-xs uppercase tracking-[0.14em] text-primary transition-colors hover:border-accent hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40';

function formatPrice(value) {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value);
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export default function ProductCard({ record, onUpdate }) {
  const [copied, setCopied] = useState('');
  const [zipProgress, setZipProgress] = useState(null);
  const [message, setMessage] = useState('');
  const copyTimer = useRef(null);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const handleCopy = async (field, value) => {
    try {
      await copyText(value);
      setCopied(field);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(''), 1600);
    } catch {
      setMessage('Не удалось скопировать текст.');
    }
  };

  const handleZip = async () => {
    setMessage('');
    setZipProgress({ done: 0, total: record.photos.length });
    try {
      const result = await downloadPhotosZip(record, (done, total) =>
        setZipProgress({ done, total }),
      );
      setMessage(
        result.failed
          ? `ZIP готов: ${result.downloaded} фото, ошибок: ${result.failed}.`
          : `ZIP готов: ${result.downloaded} фото.`,
      );
    } catch (error) {
      setMessage(error.message || 'Не удалось создать ZIP.');
    } finally {
      setZipProgress(null);
    }
  };

  return (
    <article className="overflow-hidden border border-primary/10 bg-background shadow-elevated">
      <div className="grid md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="aspect-[4/5] overflow-hidden bg-surface md:aspect-auto md:min-h-full">
          {record.photos[0] ? (
            <img
              src={wallapopMediaUrl(record.photos[0])}
              alt={record.titleEs}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-primary/35">
              Нет фотографии
            </div>
          )}
        </div>

        <div className="space-y-5 p-5 md:p-6">
          <header>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-primary/45">
              <span>{record.siteCategoryName}</span>
              <span aria-hidden="true">·</span>
              <span>ID: {record.productId}</span>
            </div>
            <h2 className="font-serif text-2xl font-normal leading-tight text-primary">
              {record.titleEs}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-primary/55">
              {record.wallapopCategory} → {record.wallapopSection} → {record.wallapopType}
            </p>
          </header>

          <dl className="grid grid-cols-2 gap-3 border-y border-primary/10 py-4 text-sm">
            <div>
              <dt className="text-[10px] uppercase tracking-[0.16em] text-primary/40">Цена</dt>
              <dd className="mt-1 font-serif text-xl">{formatPrice(record.price)} €</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.16em] text-primary/40">Размеры</dt>
              <dd className="mt-1 text-sm text-primary/75">{record.size || '—'}</dd>
            </div>
          </dl>

          <div>
            <div className="mb-2 flex items-center justify-between gap-4">
              <span className="text-[10px] uppercase tracking-[0.16em] text-primary/40">
                Описание для объявления
              </span>
              <span className="text-[10px] uppercase tracking-[0.14em] text-primary/35">ES</span>
            </div>
            <p className="max-h-36 overflow-y-auto whitespace-pre-line pr-2 text-sm leading-relaxed text-primary/70">
              {record.descriptionEs}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              className={ACTION}
              onClick={() => handleCopy('title', record.titleEs)}
            >
              {copied === 'title' ? 'Название скопировано' : 'Копировать название'}
            </button>
            <button
              type="button"
              className={ACTION}
              onClick={() => handleCopy('description', record.descriptionEs)}
            >
              {copied === 'description' ? 'Описание скопировано' : 'Копировать описание'}
            </button>
            <button
              type="button"
              className={ACTION}
              onClick={() => handleCopy('price', String(record.price))}
            >
              {copied === 'price' ? 'Цена скопирована' : 'Копировать цену'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              className={ACTION}
              onClick={handleZip}
              disabled={Boolean(zipProgress) || record.photos.length === 0}
            >
              {zipProgress
                ? `ZIP ${zipProgress.done}/${zipProgress.total}`
                : `Скачать ZIP · ${record.photos.length} фото`}
            </button>
            <a
              href={WALLAPOP_SELL_URL}
              target="_blank"
              rel="noreferrer"
              className={`${ACTION} bg-primary text-background hover:bg-accent hover:text-primary`}
            >
              Открыть форму Wallapop
            </a>
          </div>

          {record.photos.length > 10 && (
            <p className="border-l-2 border-danger pl-3 text-xs leading-relaxed text-danger">
              В ZIP войдут все {record.photos.length} фото. Wallapop позволяет выбрать не более 10.
            </p>
          )}

          <StatusControl productId={record.productId} value={record.status} onChange={onUpdate} />

          <label className="block">
            <span className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-primary/40">
              Локальная заметка
            </span>
            <textarea
              key={`${record.productId}-${record.notes}`}
              defaultValue={record.notes}
              rows={2}
              onBlur={(event) => {
                if (event.target.value !== record.notes) {
                  onUpdate(record.productId, { notes: event.target.value });
                }
              }}
              placeholder="Например: опубликовано без доставки"
              className="w-full resize-y border border-primary/15 bg-surface/45 px-3 py-2 text-sm text-primary outline-none transition-colors placeholder:text-primary/30 focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
            />
          </label>

          <footer className="flex flex-wrap justify-between gap-2 border-t border-primary/10 pt-4 text-[10px] uppercase tracking-[0.13em] text-primary/35">
            <span>Артикул: {record.reference || '—'}</span>
            <span>Изменено: {formatDate(record.updatedAt)}</span>
          </footer>

          {message && <p className="text-xs text-primary/60">{message}</p>}
        </div>
      </div>
    </article>
  );
}
