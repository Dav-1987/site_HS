import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useSettings } from '../settings/SettingsContext.jsx';
import SocialMeta from '../components/SocialMeta.jsx';
import HreflangLinks from '../components/HreflangLinks.jsx';
import Reveal from '../components/Reveal.jsx';
import ReviewTile from '../components/ReviewTile.jsx';
import Lightbox from '../components/Lightbox.jsx';
import { resolveImage } from '../data/catalog.js';
import { toLightboxItems } from '../data/settings.js';
import NotFound from './NotFound.jsx';

const SITE = 'https://hsmuebles.es';

/**
 * Стена отзывов: скриншоты реальных переписок и ролики клиентов, без оценок,
 * подписей и привязки к товарам — скриншот и есть отзыв.
 *
 * Раздел выключается тумблером `blocks.reviews` в /admin. Выключенный он и
 * правда исчезает: маршрут выпадает из src/routes.js, то есть из пререндера и
 * sitemap, а здесь отдаётся 404 — чтобы адрес, набранный вручную, не показывал
 * пустую страницу, которую владелец считает отключённой.
 */
export default function Reviews() {
  const { t, localize } = useLanguage();
  const { settings } = useSettings();
  const [lightbox, setLightbox] = useState(-1);

  if (settings.blocks?.reviews === false) return <NotFound />;

  const reviews = settings.reviews ?? [];
  const esPath = '/opiniones';
  const canonicalUrl = `${SITE}${localize(esPath)}`;
  const items = toLightboxItems(reviews);
  const firstImage = reviews.find((r) => r.image)?.image;

  return (
    <>
      <title>{`${t('reviews.title')} | Mirage Muebles`}</title>
      <meta name="description" content={t('reviews.intro')} />
      <link rel="canonical" href={canonicalUrl} />
      <HreflangLinks esPath={esPath} />
      <SocialMeta
        title={`${t('reviews.title')} | Mirage Muebles`}
        description={t('reviews.intro')}
        url={canonicalUrl}
        image={firstImage ? resolveImage(firstImage, 1600) : undefined}
      />

      <section className="px-6 pb-24 pt-8 md:px-12 md:pb-32 md:pt-12 lg:px-20">
        <Reveal className="max-w-xl">
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-accent-text">
            {t('reviews.eyebrow')}
          </p>
          <h1 className="font-serif text-[clamp(2.5rem,4vw,3.25rem)] font-light leading-[1.05] tracking-tight text-primary">
            {t('reviews.title')}
          </h1>
          <p className="mt-8 text-sm leading-relaxed text-secondary">{t('reviews.intro')}</p>
        </Reveal>

        {reviews.length > 0 ? (
          <Reveal
            delay={0.1}
            className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 md:mt-20"
          >
            {reviews.map((review, i) => (
              <ReviewTile
                key={review.video || review.image}
                review={review}
                index={i}
                onOpen={setLightbox}
              />
            ))}
          </Reveal>
        ) : (
          <p className="mt-14 text-sm text-secondary">{t('reviews.empty')}</p>
        )}
      </section>

      {lightbox >= 0 && (
        <Lightbox
          items={items}
          index={lightbox}
          alt={t('reviews.alt')}
          onClose={() => setLightbox(-1)}
          onIndex={setLightbox}
        />
      )}
    </>
  );
}
