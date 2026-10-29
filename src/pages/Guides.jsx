import { useLanguage } from '../i18n/LanguageContext.jsx';
import Reveal from '../components/Reveal.jsx';
import JsonLd from '../components/JsonLd.jsx';
import SocialMeta from '../components/SocialMeta.jsx';
import HreflangLinks from '../components/HreflangLinks.jsx';
import GuideCard from '../components/guide/GuideCard.jsx';
import NotFound from './NotFound.jsx';
import { GUIDES } from '../guides/content.js';
import { GUIDE_TOPICS, GUIDES_SLUG } from '../data/guides.js';
import { resolveImage } from '../data/catalog.js';
import { SITE, breadcrumbSchema, guideListSchema } from '../seo/schema.js';

/**
 * /guias — every published article, grouped by topic. With nothing published
 * the section has no page (src/routes.js) and this answers 404 too.
 */
export default function Guides() {
  const { lang, t, localize } = useLanguage();
  if (!GUIDES.length) return <NotFound />;

  const esPath = `/${GUIDES_SLUG}`;
  const canonicalUrl = `${SITE}${localize(esPath)}`;
  const title = `${t('guides.meta.title')} | Mirage Muebles`;
  const topics = GUIDE_TOPICS.map((topic) => ({
    topic,
    guides: GUIDES.filter((g) => g.topic === topic),
  })).filter((group) => group.guides.length);

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={t('guides.meta.description')} />
      <link rel="canonical" href={canonicalUrl} />
      <HreflangLinks esPath={esPath} />
      <SocialMeta
        title={title}
        description={t('guides.meta.description')}
        url={canonicalUrl}
        image={resolveImage(GUIDES[0].cover, 1600)}
      />
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: t('nav.home'), url: `${SITE}${localize('/')}` },
            { name: t('guides.title'), url: canonicalUrl },
          ]),
          guideListSchema(GUIDES, lang),
        ]}
      />

      <section className="px-6 pt-8 md:px-12 md:pt-12 lg:px-20">
        <Reveal className="max-w-3xl">
          <h1 className="font-serif text-[clamp(3rem,5.6vw,4.5rem)] font-light leading-[1.02] tracking-tight text-primary">
            {t('guides.title')}
          </h1>
          <p className="mt-6 text-base leading-relaxed text-secondary md:text-lg">
            {t('guides.intro')}
          </p>
        </Reveal>
      </section>

      <div className="pb-24 md:pb-32">
        {topics.map(({ topic, guides }) => (
          <section
            key={topic}
            aria-labelledby={`topic-${topic}`}
            className="px-6 pt-14 md:px-12 md:pt-20 lg:px-20"
          >
            <h2
              id={`topic-${topic}`}
              className="mb-10 border-b border-primary/10 pb-4 text-xs uppercase tracking-[0.2em] text-secondary"
            >
              {t(`guides.topic.${topic}`)}
            </h2>
            <Reveal
              stagger
              className="grid grid-cols-1 gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3"
            >
              {guides.map((guide) => (
                <GuideCard key={guide.slug} guide={guide} />
              ))}
            </Reveal>
          </section>
        ))}
      </div>
    </>
  );
}
