import ImageField from './ImageField.jsx';
import { IMAGE_SPECS } from '../imageSpecs.js';
import VideoField from './VideoField.jsx';
import Collapsible from './Collapsible.jsx';

export default function HeroSettingsEditor({ settings, onChange }) {
  // Into the settings as they are when the change lands — the photo and video
  // here upload for seconds (see ../update.js).
  const setHero = (patch) => onChange((s) => ({ ...s, hero: { ...s.hero, ...patch } }));
  const { hero } = settings;
  const summary = hero.video ? 'видео' : hero.image ? 'фото' : 'не задан';

  return (
    <Collapsible title="Главный экран" summary={summary}>
      <ImageField
        label="Фоновое изображение (ПК)"
        value={hero.image}
        onChange={(v) => setHero({ image: v })}
        frames={[['16 / 9', 'Десктоп']]}
        spec={IMAGE_SPECS.hero}
        hint="Минимум 1920 × 1080 px. JPG/WebP, до 5 МБ."
      />
      <ImageField
        label="Фоновое изображение (мобильные)"
        value={hero.imageMobile}
        onChange={(v) => setHero({ imageMobile: v })}
        frames={[['3 / 4', 'Мобильный']]}
        spec={IMAGE_SPECS.heroMobile}
        hint="Минимум 1080 × 1440 px. JPG/WebP, до 5 МБ."
      />
      <p className="text-xs leading-relaxed text-primary/75">
        Фото на весь первый экран, заголовок выводится по центру поверх него. Пусто в поле
        «мобильные» — используется то же фото, что для ПК.
      </p>
      <VideoField
        label="Фоновое видео (заменяет фото если загружено)"
        value={hero.video}
        onChange={(v) => setHero({ video: v })}
      />
    </Collapsible>
  );
}
