import { useState } from 'react';
import { resolveImage } from '../../data/catalog.js';
import { uploadImage, uploadVideo } from '../api.js';
import { LABEL } from '../ui.js';

// Unified media editor for a product: photos AND videos in one drag-to-reorder
// grid. Any item can be moved to any position; the first photo is the catalog
// cover. Multi-upload for both photos and videos.
//
// `media` is an ordered array of { type: 'image'|'video', src }.
export default function ProductImagesEditor({ media, onChange }) {
  const items = Array.isArray(media) ? media : [];
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoProgress, setPhotoProgress] = useState('');
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoProgress, setVideoProgress] = useState('');
  const [errors, setErrors] = useState([]);
  const [replacingIdx, setReplacingIdx] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  // Index of the first photo — that's the catalog cover.
  const coverIdx = items.findIndex((m) => m.type !== 'video');

  const remove = (i) => {
    const isVid = items[i]?.type === 'video';
    if (!window.confirm(isVid ? 'Удалить это видео?' : 'Удалить это фото?')) return;
    onChange(items.filter((_, j) => j !== i));
  };

  // Drag-and-drop reordering (works across photos and videos alike).
  const onDragStart = (e, i) => {
    setDragIdx(i);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(i));
  };
  const onDragOver = (e, i) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (i !== overIdx) setOverIdx(i);
  };
  const onDrop = (e, i) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) { setDragIdx(null); setOverIdx(null); return; }
    const next = [...items];
    const [dragged] = next.splice(dragIdx, 1);
    next.splice(i, 0, dragged);
    onChange(next);
    setDragIdx(null);
    setOverIdx(null);
  };
  const onDragEnd = () => { setDragIdx(null); setOverIdx(null); };

  // Multi-upload helper shared by photo/video add tiles.
  const uploadMany = async (files, kind) => {
    const upload = kind === 'video' ? uploadVideo : uploadImage;
    const type = kind === 'video' ? 'video' : 'image';
    const setBusy = kind === 'video' ? setVideoUploading : setPhotoUploading;
    const setProgress = kind === 'video' ? setVideoProgress : setPhotoProgress;
    setBusy(true);
    setProgress(`0 / ${files.length}`);
    setErrors([]);
    const added = [];
    const errs = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const { url } = await upload(files[i]);
        added.push({ type, src: url });
      } catch (err) {
        errs.push(`${files[i].name}: ${err.message || 'Ошибка загрузки'}`);
      }
      setProgress(`${i + 1} / ${files.length}`);
    }
    setBusy(false);
    setProgress('');
    setErrors(errs);
    if (added.length) onChange([...items, ...added]);
  };

  const onAddPhotos = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length) uploadMany(files, 'image');
  };
  const onAddVideos = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length) uploadMany(files, 'video');
  };

  const onReplace = async (e, idx) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const item = items[idx];
    const upload = item.type === 'video' ? uploadVideo : uploadImage;
    setReplacingIdx(idx);
    setErrors([]);
    try {
      const { url } = await upload(file);
      onChange(items.map((x, j) => (j === idx ? { ...x, src: url } : x)));
    } catch (err) {
      setErrors([`${file.name}: ${err.message || 'Ошибка загрузки'}`]);
    } finally {
      setReplacingIdx(null);
    }
  };

  return (
    <div>
      <span className={LABEL}>Фото и видео — перетаскивайте в любом порядке (первое фото — обложка каталога)</span>

      {/* Drag-to-reorder media grid */}
      <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-6">
        {items.map((item, i) => {
          const isVid = item.type === 'video';
          const isReplacing = replacingIdx === i;
          const isDragging = dragIdx === i;
          const isOver = overIdx === i && dragIdx !== null && dragIdx !== i;
          const src = isVid ? item.src : resolveImage(item.src, 200);

          return (
            <div
              key={i}
              draggable
              onDragStart={(e) => onDragStart(e, i)}
              onDragOver={(e) => onDragOver(e, i)}
              onDrop={(e) => onDrop(e, i)}
              onDragEnd={onDragEnd}
              className={[
                'group relative aspect-square overflow-hidden border bg-surface transition-opacity duration-150 cursor-grab active:cursor-grabbing',
                isDragging ? 'opacity-30 border-accent' : 'border-primary/10',
                isOver ? 'ring-2 ring-accent ring-offset-1' : '',
              ].join(' ')}
            >
              {/* Position / role badge */}
              {i === coverIdx ? (
                <span className="pointer-events-none absolute left-1 top-1 z-10 bg-background/80 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-primary/60">
                  Обложка
                </span>
              ) : (
                <span className="pointer-events-none absolute left-1 top-1 z-10 bg-background/80 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-primary/50">
                  {i + 1}
                </span>
              )}

              {/* Video marker */}
              {isVid && (
                <span className="pointer-events-none absolute right-1 top-1 z-10 bg-primary/70 px-1 py-0.5 text-[9px] text-background">▶</span>
              )}

              {/* Thumbnail */}
              {isVid ? (
                <video src={src} muted playsInline className="h-full w-full object-cover pointer-events-none" />
              ) : src ? (
                <img src={src} alt="" className="h-full w-full object-cover pointer-events-none" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="font-serif text-xl font-light text-primary/20">HS</span>
                </div>
              )}

              {/* Hover overlay — replace + delete */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-primary/65 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <label className="cursor-pointer text-center text-[10px] uppercase tracking-[0.1em] text-background transition-colors hover:text-accent">
                  {isReplacing ? '…' : '↺ Заменить'}
                  <input
                    type="file"
                    accept={isVid ? 'video/*' : 'image/*'}
                    className="hidden"
                    disabled={isReplacing}
                    onChange={(e) => onReplace(e, i)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label={isVid ? 'Удалить видео' : 'Удалить фото'}
                  className="text-[10px] uppercase tracking-[0.1em] text-background/70 transition-colors hover:text-red-400"
                >
                  × Удалить
                </button>
              </div>
            </div>
          );
        })}

        {/* Add photos */}
        <label
          className="aspect-square cursor-pointer border border-dashed border-primary/20 bg-transparent flex flex-col items-center justify-center gap-1 text-primary/30 transition-colors hover:border-accent hover:text-accent"
          onDragOver={(e) => e.preventDefault()}
        >
          {photoUploading ? (
            <span className="text-[10px] uppercase tracking-[0.1em]">{photoProgress}</span>
          ) : (
            <>
              <span className="text-2xl leading-none">+</span>
              <span className="text-[9px] uppercase tracking-[0.1em]">Фото</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={photoUploading}
            onChange={onAddPhotos}
          />
        </label>

        {/* Add videos */}
        <label className="aspect-square cursor-pointer border border-dashed border-primary/20 bg-transparent flex flex-col items-center justify-center gap-1 text-primary/30 transition-colors hover:border-accent hover:text-accent">
          {videoUploading ? (
            <span className="text-[10px] uppercase tracking-[0.1em]">{videoProgress}</span>
          ) : (
            <>
              <span className="text-2xl leading-none">▶</span>
              <span className="text-[9px] uppercase tracking-[0.1em]">Видео</span>
            </>
          )}
          <input
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            disabled={videoUploading}
            onChange={onAddVideos}
          />
        </label>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-primary/40">
        Видео: MP4, WebM, MOV, макс. 200 МБ. Порядок плиток = порядок в галерее товара.
        Держите хотя бы одно фото — первое фото используется как обложка в каталоге.
      </p>

      {errors.length > 0 && (
        <div className="mt-2 space-y-1">
          {errors.map((msg, i) => (
            <p key={i} className="text-xs text-red-600">{msg}</p>
          ))}
        </div>
      )}
    </div>
  );
}
