import { useState } from 'react';

/**
 * Спойлер для группы полей внутри открытой карточки.
 *
 * В карточке товара десять групп; развёрнутые разом они давали простыню в
 * несколько тысяч пикселей, и любая правка начиналась с поисков прокруткой.
 * Свёрнутые — карточка открывается списком из десяти заголовков, а `hint`
 * справа показывает то, ради чего группу обычно и открывали (цену, число фото,
 * артикул), так что раскрывать нужно только то, что правишь.
 *
 * Содержимое размонтируется на закрытии — как и у всех остальных спойлеров
 * админки; данные живут в родителе, поэтому терять нечего.
 */
export default function Section({ title, hint, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center gap-2 py-3 text-left sm:min-h-0"
      >
        <span
          className={`shrink-0 text-base leading-none text-primary/40 transition-transform ${
            open ? 'rotate-45' : ''
          }`}
        >
          +
        </span>
        <span className="text-xs font-medium uppercase tracking-[0.22em] text-accent-text">
          {title}
        </span>
        {hint && (
          <span className="ml-auto min-w-0 truncate pl-3 text-xs text-primary/35">{hint}</span>
        )}
      </button>
      {open && <div className="pb-5">{children}</div>}
    </div>
  );
}
