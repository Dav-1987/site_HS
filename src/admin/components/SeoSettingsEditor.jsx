import ImageField from './ImageField.jsx';
import { Field, TextArea } from './Field.jsx';
import Collapsible from './Collapsible.jsx';
import { IMAGE_SPECS } from '../imageSpecs.js';

const EMPTY_SEO = { image: '', title: '', description: '' };

/**
 * Social/SEO preview editor — controls the image, title and description that
 * appear when the site is shared (WhatsApp, Telegram, X, Facebook…). Sets the
 * home-page share card and the default preview image for pages without one.
 */
export default function SeoSettingsEditor({ settings, onChange }) {
  const seo = settings.seo || EMPTY_SEO;
  // Into the settings as they are when the change lands — the preview image
  // uploads for seconds (see ../update.js).
  const set = (patch) => onChange((s) => ({ ...s, seo: { ...(s.seo || EMPTY_SEO), ...patch } }));
  const own = [seo.image, seo.title, seo.description].filter(Boolean).length;

  return (
    <Collapsible
      title="Превью при отправке ссылки"
      summary={own ? `своё: ${own} из 3` : 'по умолчанию'}
    >
      <ImageField
        label="Картинка превью"
        value={seo.image}
        onChange={(v) => set({ image: v })}
        frames={[['1.91 / 1', 'Превью 1.91:1']]}
        spec={IMAGE_SPECS.social}
        hint="JPG/WebP/PNG, до 5 МБ. Пусто — используется фото главного экрана."
      />
      <Field
        label="Заголовок превью"
        value={seo.title}
        onChange={(v) => set({ title: v })}
        placeholder="Mirage Muebles — Mobiliario minimalista"
      />
      <TextArea
        label="Описание превью"
        rows={3}
        value={seo.description}
        onChange={(v) => set({ description: v })}
        placeholder="Tocadores, espejos y mobiliario de diseño minimalista. Montaje gratis."
      />
      <p className="text-xs leading-relaxed text-primary/75">
        Так выглядит ссылка на сайт при отправке в WhatsApp, Telegram, Instagram и др. Пустые поля —
        берутся значения по умолчанию.
      </p>
    </Collapsible>
  );
}
