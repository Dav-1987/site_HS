import { useState } from 'react';
import ImageField from './ImageField.jsx';
import VideoField from './VideoField.jsx';

export default function HeroSettingsEditor({ settings, onChange }) {
  const [open, setOpen] = useState(false);
  const setHero = (patch) =>
    onChange({ ...settings, hero: { ...settings.hero, ...patch } });

  return (
    <div className="border border-primary/15 bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <span className={`text-base transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
        <span className="font-serif text-xl font-light text-primary">Главный экран</span>
        <span className="text-xs uppercase tracking-[0.18em] text-primary/40">Hero</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-primary/10 px-5 py-6">
          <ImageField
            label="Фоновое изображение (ПК)"
            value={settings.hero.image}
            onChange={(v) => setHero({ image: v })}
            frames={[['16 / 9', 'Десктоп']]}
          />
          <ImageField
            label="Фоновое изображение (мобильные)"
            value={settings.hero.imageMobile}
            onChange={(v) => setHero({ imageMobile: v })}
            frames={[['3 / 4', 'Мобильный']]}
          />
          <p className="text-xs leading-relaxed text-primary/40">
            Фото на весь первый экран, заголовок выводится по центру поверх него.
            Пусто в поле «мобильные» — используется то же фото, что для ПК.
          </p>
          <VideoField
            label="Фоновое видео (заменяет фото если загружено)"
            value={settings.hero.video}
            onChange={(v) => setHero({ video: v })}
          />
        </div>
      )}
    </div>
  );
}
