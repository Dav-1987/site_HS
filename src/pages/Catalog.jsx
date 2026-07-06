import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useCatalog } from '../catalog/CatalogContext.jsx';
import Reveal from '../components/Reveal.jsx';
import CategoryCard from '../components/CategoryCard.jsx';
import JsonLd from '../components/JsonLd.jsx';
import SocialMeta from '../components/SocialMeta.jsx';
import HreflangLinks from '../components/HreflangLinks.jsx';
import { resolveImage } from '../data/catalog.js';
import { breadcrumbSchema, categoryListSchema } from '../seo/schema.js';

const SITE = 'https://hsmuebles.es';

export default function Catalog() {
  const { t, lang, localize } = useLanguage();
  const { categories } = useCatalog();
  const esPath = '/catalogo';
  const canonicalUrl = `${SITE}${localize(esPath)}`;
  const metaDesc = t('catalog.meta.description').replace('{count}', categories.length);
  const ogDesc = t('catalog.og.description').replace('{count}', categories.length);

  return (
    <>
      <title>{t('catalog.meta.title')}</title>
      <meta name="description" content={metaDesc} />
      <link rel="canonical" href={canonicalUrl} />
      <HreflangLinks esPath={esPath} />
      <SocialMeta
        title={t('catalog.og.title')}
        description={ogDesc}
        url={canonicalUrl}
        image={resolveImage(categories[0]?.image, 1600)}
      />
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: t('nav.home'), url: `${SITE}${localize('/')}` },
            { name: t('nav.catalog'), url: canonicalUrl },
          ]),
          categoryListSchema(categories, lang),
        ]}
      />
      <section className="px-3 pb-8 pt-4 md:px-12 md:pb-12 md:pt-6 lg:px-20">
        <Reveal className="mb-6 max-w-3xl md:mb-10">
          <p className="mb-2 text-xs uppercase tracking-[0.3em] text-accent">
            {t('catalog.eyebrow')}
          </p>
          <h1 className="font-serif text-[clamp(2.25rem,4.7vw,3.75rem)] font-light leading-[1.02] tracking-tight text-primary">
            {t('catalog.title')}
          </h1>
        </Reveal>

        <Reveal stagger className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-6 lg:gap-8">
          {categories.map((c) => (
            <CategoryCard key={c.slug} category={c} />
          ))}
        </Reveal>
      </section>
    </>
  );
}
