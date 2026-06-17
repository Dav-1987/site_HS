import { useState } from 'react';
import ImageField from './ImageField.jsx';

const FIELD_CLASS =
  'w-full border border-primary/20 bg-background px-3 py-2 text-sm text-primary outline-none transition-colors focus:border-accent';
const LABEL_CLASS = 'mb-1 block text-[11px] uppercase tracking-[0.18em] text-primary/40';

/**
 * Social/SEO preview editor — controls the image, title and description that
 * appear when the site is shared (WhatsApp, Telegram, X, Facebook…). Sets the
 * home-page share card and the default preview image for pages without one.
 */
export default function SeoSettingsEditor({ settings, onChange }) {
  const [open, setOpen] = useState(false);
  const seo = settings.seo || { image: '', title: '', description: '' };
  const set = (patch) => onChange({ ...settings, seo: { ...seo, ...patch } });

  return (
    <div className="border border-primary/15 bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <span className={`text-base transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
        <span className="font-serif text-xl font-light text-primary">Превью при отправке ссылки</span>
        <span className="text-xs uppercase tracking-[0.18em] text-primary/40">Social / SEO</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-primary/10 px-5 py-6">
          <ImageField
            label="Картинка превью"
            value={seo.image}
            onChange={(v) => set({ image: v })}
            frames={[['1.91 / 1', 'Превью 1.91:1']]}
            hint="Рекомендуемый размер: 1200×630 px (соотношение 1.91:1). JPG/WebP/PNG, до 5 МБ. Пусто — используется фото главного экрана."
          />
          <div>
            <label className={LABEL_CLASS}>Заголовок превью</label>
            <input
              type="text"
              value={seo.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="HS Muebles — Mobiliario minimalista"
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Описание превью</label>
            <textarea
              rows={3}
              value={seo.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="Tocadores, espejos y mobiliario de diseño minimalista. Envío y montaje gratis."
              className={`${FIELD_CLASS} resize-y`}
            />
          </div>
          <p className="text-xs leading-relaxed text-primary/40">
            Так выглядит ссылка на сайт при отправке в WhatsApp, Telegram, Instagram и др.
            Пустые поля — берутся значения по умолчанию.
          </p>
        </div>
      )}
    </div>
  );
}
