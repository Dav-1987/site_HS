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
import ProductCarousel from '../components/ProductCarousel.jsx';

function Hero() {
  const { t } = useLanguage();
  const { settings } = useSettings();
  return (
    <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-surface text-center">
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

      {/* Centered content */}
      <Reveal stagger className="relative z-10 mx-auto max-w-3xl px-6">
        <p className="mb-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent sm:text-sm sm:tracking-[0.4em]">
          {t('hero.eyebrow')}
        </p>
        <h1 className="font-serif font-semibold leading-[0.95] tracking-tightest text-primary text-[9vw] sm:text-[7.5vw] lg:text-[5vw]">
          <span className="block">{t('hero.title.1')}</span>
          <span className="block italic text-primary">{t('hero.title.2')}</span>
          <span className="block">{t('hero.title.3')}</span>
        </h1>
        <p className="mx-auto mt-8 max-w-md text-base leading-relaxed text-primary">
          {t('hero.subtitle')}
        </p>
        <div className="mx-auto mt-8 max-w-lg space-y-3">
          <p className="text-lg font-bold uppercase tracking-[0.15em] text-primary">
            {t('hero.promo')}
          </p>
          <p className="text-base font-medium leading-relaxed text-primary">
            {t('hero.promo.perks')}
          </p>
        </div>
        <div className="mt-10 flex justify-center">
          <Button to="/catalogo" variant="solid">
            {t('hero.cta')}
          </Button>
        </div>
      </Reveal>
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

  return (
    <section className="py-24 md:py-32">
      <div className="px-6 md:px-12 lg:px-20">
        <SectionHeader
          eyebrow={t('section.featured.eyebrow')}
          title={t('section.featured.title')}
          action={
            <Button to="/catalogo" variant="ghost">
              {t('common.viewAll')} →
            </Button>
          }
        />
      </div>

      <ProductCarousel products={featured} />
    </section>
  );
}

function CategoriesSection() {
  const { t } = useLanguage();
  const { categories } = useCatalog();
  return (
    <section className="bg-surface px-3 py-16 md:px-12 md:py-32 lg:px-20">
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

function AboutSection() {
  const { t } = useLanguage();
  const { categories } = useCatalog();
  const stats = [1, 2, 3];
  return (
    <section id="nosotros" className="scroll-mt-24 px-6 py-24 md:px-12 md:py-32 lg:px-20">
      <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-24">
        <Reveal className="order-2 lg:order-1">
          <div className="relative aspect-[5/6] overflow-hidden bg-surface">
            <Media id="1556228453-efd6c1ff04f6" alt={t('section.about.title')} w={1000} />
          </div>
        </Reveal>

        <Reveal stagger className="order-1 lg:order-2">
          <p className="mb-5 text-xs uppercase tracking-[0.3em] text-accent">
            {t('section.about.eyebrow')}
          </p>
          <h2 className="font-serif text-4xl font-light leading-tight tracking-tight text-primary md:text-5xl">
            {t('section.about.title')}
          </h2>
          <p className="mt-7 max-w-lg leading-relaxed text-secondary">
            {t('section.about.body.1')}
          </p>
          <p className="mt-4 max-w-lg leading-relaxed text-secondary">
            {t('section.about.body.2')}
          </p>

          <div className="mt-12 grid grid-cols-3 gap-6 border-t border-primary/10 pt-10">
            {stats.map((n) => (
              <div key={n}>
                <p className="font-serif text-4xl font-light text-primary md:text-5xl">
                  {n === 2 ? categories.length : t(`about.stat.${n}.value`)}
                </p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.15em] text-secondary">
                  {t(`about.stat.${n}.label`)}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function CtaSection() {
  const { t } = useLanguage();
  return (
    <section className="px-6 pb-24 md:px-12 md:pb-32 lg:px-20">
      <Reveal className="relative overflow-hidden bg-primary px-8 py-20 text-center md:px-12 md:py-28">
        <h2 className="mx-auto max-w-2xl font-serif text-4xl font-light leading-tight text-background md:text-5xl">
          {t('section.cta.title')}
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-background/70">
          {t('section.cta.body')}
        </p>
        <div className="mt-9 flex justify-center">
          <Button
            to="/contacto"
            className="border-background/30 text-background hover:bg-background hover:text-primary"
          >
            {t('section.cta.button')}
          </Button>
        </div>
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
      <AboutSection />
      <CtaSection />
    </>
  );
}
