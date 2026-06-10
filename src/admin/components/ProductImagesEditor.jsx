import { useState } from 'react';
import { resolveImage } from '../../data/catalog.js';
import { uploadImage } from '../api.js';
import { LABEL } from '../ui.js';

// Multi-photo editor for a product: drag-to-reorder grid, multi-upload, replace
// and delete. First photo is the cover.
export default function ProductImagesEditor({ images, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadErrors, setUploadErrors] = useState([]);
  const [replacingIdx, setReplacingIdx] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  const remove = (i) => {
    if (!window.confirm('Удалить это фото?')) return;
    onChange(images.filter((_, j) => j !== i));
  };

  // Drag-and-drop handlers
  const onDragStart = (e, i) => {
    setDragIdx(i);
    e.dataTransfer.effectAllowed = 'move';
    // Transparent drag ghost — браузер сам рисует превью
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
    const next = [...images];
    const [dragged] = next.splice(dragIdx, 1);
    next.splice(i, 0, dragged);
    onChange(next);
    setDragIdx(null);
    setOverIdx(null);
  };
  const onDragEnd = () => { setDragIdx(null); setOverIdx(null); };

  const onMultiUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    setUploadProgress(`0 / ${files.length}`);
    setUploadErrors([]);
    const urls = [];
    const errors = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const { url } = await uploadImage(files[i]);
        urls.push(url);
      } catch (err) {
        errors.push(`${files[i].name}: ${err.message || 'Ошибка загрузки'}`);
      }
      setUploadProgress(`${i + 1} / ${files.length}`);
    }
    setUploading(false);
    setUploadProgress('');
    setUploadErrors(errors);
    if (urls.length) onChange([...images, ...urls]);
  };

  const onReplace = async (e, idx) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setReplacingIdx(idx);
    setUploadErrors([]);
    try {
      const { url } = await uploadImage(file);
      onChange(images.map((x, j) => (j === idx ? url : x)));
    } catch (err) {
      setUploadErrors([`${file.name}: ${err.message || 'Ошибка загрузки'}`]);
    } finally {
      setReplacingIdx(null);
    }
  };

  return (
    <div>
      <span className={LABEL}>Фотографии (первая — обложка)</span>

      {/* Compact thumbnail grid */}
      <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-6">
        {images.map((img, i) => {
          const src = resolveImage(img, 200);
          const isReplacing = replacingIdx === i;
          const isDragging = dragIdx === i;
          const isOver = overIdx === i && dragIdx !== null && dragIdx !== i;

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
              {/* Cover badge */}
              {i === 0 && (
                <span className="pointer-events-none absolute left-1 top-1 z-10 bg-background/80 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-primary/60">
                  Обложка
                </span>
              )}

              {/* Thumbnail */}
              {src ? (
                <img src={src} alt="" className="h-full w-full object-cover pointer-events-none" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="font-serif text-xl font-light text-primary/20">HS</span>
                </div>
              )}

              {/* Hover overlay — replace + delete */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-primary/65 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                {/* Replace */}
                <label className="cursor-pointer text-center text-[10px] uppercase tracking-[0.1em] text-background transition-colors hover:text-accent">
                  {isReplacing ? '…' : '↺ Заменить'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isReplacing || uploading}
                    onChange={(e) => onReplace(e, i)}
                  />
                </label>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label="Удалить фото"
                  className="text-[10px] uppercase tracking-[0.1em] text-background/70 transition-colors hover:text-red-400"
                >
                  × Удалить
                </button>
              </div>
            </div>
          );
        })}

        {/* Add tile — triggers multi-upload */}
        <label
          className="aspect-square cursor-pointer border border-dashed border-primary/20 bg-transparent flex flex-col items-center justify-center gap-1 text-primary/30 transition-colors hover:border-accent hover:text-accent"
          onDragOver={(e) => e.preventDefault()}
        >
          {uploading ? (
            <span className="text-[10px] uppercase tracking-[0.1em]">{uploadProgress}</span>
          ) : (
            <>
              <span className="text-2xl leading-none">+</span>
              <span className="text-[9px] uppercase tracking-[0.1em]">Добавить</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={onMultiUpload}
          />
        </label>
      </div>

      {/* Errors */}
      {uploadErrors.length > 0 && (
        <div className="mt-2 space-y-1">
          {uploadErrors.map((msg, i) => (
            <p key={i} className="text-xs text-red-600">{msg}</p>
          ))}
        </div>
      )}
    </div>
  );
}
