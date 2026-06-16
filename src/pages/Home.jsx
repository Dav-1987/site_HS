import { useMemo } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useCatalog } from '../catalog/CatalogContext.jsx';
import { useSettings } from '../settings/SettingsContext.jsx';
import { computeFeatured } from '../data/catalog.js';
import Media from '../components/Media.jsx';
import VideoMedia from '../components/VideoMedia.jsx';
import Reveal from '../components/Reveal.jsx';
import Button from '../components/Button.jsx';
import SectionHeader from '../components/SectionHeader.jsx';
import CategoryCard from '../components/CategoryCard.jsx';
import { CarouselArrows, CarouselTrack, useCarousel } from '../components/ProductCarousel.jsx';

function Hero() {
  const { t } = useLanguage();
  const { settings } = useSettings();
  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden bg-surface text-center">
      {/* Full-bleed background image (LCP — loaded eagerly). Editable in /admin;
          a warm, styled interior with a calm zone behind the centered headline. */}
      <div className="absolute inset-0">
        {settings.hero.video ? (
          <VideoMedia src={settings.hero.video} autoPlay />
        ) : (
          <Media id={settings.hero.image} idMobile={settings.hero.imageMobile} alt={t('hero.eyebrow')} w={2000} eager />
        )}
      </div>

      {/* Light legibility wash — barely lifts the photo so dark text reads cleanly,
          with a slightly heavier base under the subtitle/CTA. Uniform, never a blob. */}
      <div aria-hidden="true" className="absolute inset-0 bg-background/25" />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-background/60 via-background/25 to-transparent"
      />

      {/* Eyebrow — sits in normal flow at the top, just under the header, so it
          can never overlap the centered content below it even on short screens. */}
      <p className="relative z-10 px-6 pt-[clamp(4.5rem,11vh,7rem)] text-[10px] font-semibold uppercase tracking-[0.2em] text-accent sm:text-sm sm:tracking-[0.4em] lg:pt-[clamp(6rem,11vh,7rem)]">
        {t('hero.eyebrow')}
      </p>

      {/* Remaining content centers in whatever space is left below the eyebrow. */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 pb-[clamp(1.25rem,5vh,3.5rem)]">
        <Reveal stagger className="mx-auto max-w-3xl">
          <h1 className="font-serif font-semibold leading-[1.05] tracking-tightest text-primary text-[clamp(2rem,7vw,3.5rem)]">
            <span className="block">{t('hero.title.1')}</span>
            <span className="block italic text-primary">{t('hero.title.2')}</span>
            <span className="block">{t('hero.title.3')}</span>
          </h1>
          <p className="mx-auto mt-[clamp(0.875rem,3.5vh,2rem)] max-w-md text-base leading-relaxed text-primary">
            {t('hero.subtitle')}
          </p>
          <div className="mx-auto mt-[clamp(0.875rem,3.5vh,2rem)] max-w-lg space-y-3">
            <p className="text-lg font-bold uppercase tracking-[0.15em] text-primary">
              {t('hero.promo')}
            </p>
            <p className="text-base font-medium leading-relaxed text-primary">
              {t('hero.promo.perks')}
            </p>
          </div>
          <div className="mt-[clamp(1rem,4vh,2.5rem)] flex justify-center">
            <Button to="/catalogo" variant="solid">
              {t('hero.cta')}
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function FeaturedSection() {
  const { t } = useLanguage();
  const { categories } = useCatalog();
  const { settings } = useSettings();
  const featured = useMemo(
    () => computeFeatured(categories, settings.featured),
    [categories, settings.featured],
  );
  const carousel = useCarousel();
  if (!featured?.length) return null;

  return (
    <section className="py-14 md:py-20">
      <div className="px-6 md:px-12 lg:px-20">
        <SectionHeader
          eyebrow={t('section.featured.eyebrow')}
          title={t('section.featured.title')}
          action={
            <div className="flex flex-col items-end gap-4">
              <Button to="/catalogo" variant="ghost">
                {t('common.viewAll')} →
              </Button>
              <CarouselArrows carousel={carousel} />
            </div>
          }
        />
      </div>

      <CarouselTrack products={featured} carousel={carousel} />
    </section>
  );
}

function CategoriesSection() {
  const { t } = useLanguage();
  const { categories } = useCatalog();
  return (
    <section className="bg-surface px-3 py-14 md:px-12 md:py-20 lg:px-20">
      <SectionHeader
        eyebrow={t('section.categories.eyebrow')}
        title={t('section.categories.title')}
      />
      <Reveal stagger className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-6 lg:gap-8">
        {categories.map((c) => (
          <CategoryCard key={c.slug} category={c} />
        ))}
      </Reveal>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Hero />
      <FeaturedSection />
      <CategoriesSection />
    </>
  );
}
