import { useParams } from 'react-router-dom';
import { Link } from '../components/LocalizedLink.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useCatalog } from '../catalog/CatalogContext.jsx';
import Reveal from '../components/Reveal.jsx';
import Button from '../components/Button.jsx';
import ProductCard from '../components/ProductCard.jsx';
import CategoryCard from '../components/CategoryCard.jsx';
import OtherModelsCard from '../components/OtherModelsCard.jsx';
import NotFound from './NotFound.jsx';
import JsonLd from '../components/JsonLd.jsx';
import SocialMeta from '../components/SocialMeta.jsx';
import HreflangLinks from '../components/HreflangLinks.jsx';
import { listedProducts, OTHER_MODELS_SLUG, resolveImage } from '../data/catalog.js';
import { breadcrumbSchema, productListSchema } from '../seo/schema.js';

const SITE = 'https://hsmuebles.es';

export default function Category() {
  const { slug } = useParams();
  const { lang, t, localize } = useLanguage();
  const { categories, getCategory, loaded } = useCatalog();
  const category = getCategory(slug);

  if (!category && !loaded) return null;
  if (!category) return <NotFound />;

  const related = categories.filter((c) => c.slug !== category.slug).slice(0, 3);
  // The section's own page still opens when it is unlisted, but a product hidden
  // from listings stays off the grid (and out of the count and the schema) here
  // too — this is a listing like any other.
  const products = listedProducts(category);
  const catName = category.name[lang] ?? category.name.es;
  const catDesc = t('category.meta.description')
    .replace('{name}', catName)
    .replace('{count}', products.length);
  const esPath = `/${category.slug}`;
  const canonicalUrl = `${SITE}${localize(esPath)}`;
  const catalogUrl = `${SITE}${localize('/catalogo')}`;

  return (
    <>
      <title>{t('category.meta.title').replace('{name}', catName)}</title>
      <meta name="description" content={catDesc} />
      <link rel="canonical" href={canonicalUrl} />
      <HreflangLinks esPath={esPath} />
      <SocialMeta
        title={`${catName} | Mirage Muebles`}
        description={catDesc}
        url={canonicalUrl}
        image={resolveImage(category.image, 1600)}
      />
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: t('nav.home'), url: `${SITE}${localize('/')}` },
            { name: t('nav.catalog'), url: catalogUrl },
            { name: category.name[lang], url: canonicalUrl },
          ]),
          productListSchema(products, category.slug, lang),
        ]}
      />
      {/* Header */}
      <section className="px-6 pt-6 md:px-12 md:pt-10 lg:px-20">
        <nav
          aria-label="breadcrumb"
          className="mb-6 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.08em] text-secondary"
        >
          <Link to="/catalogo" className="transition-colors hover:text-accent-text">
            {t('nav.catalog')}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-primary/70">{category.name[lang]}</span>
        </nav>

        <Reveal>
          <h1 className="font-serif text-[clamp(3rem,5.6vw,4.5rem)] font-light leading-[1.02] tracking-tight text-primary">
            {category.name[lang]}
          </h1>
          <p className="mt-6 text-xs uppercase tracking-[0.2em] text-secondary">
            {products.length} {t('category.products')}
          </p>
        </Reveal>
      </section>

      {/* Products */}
      <section className="px-6 pb-12 pt-6 md:px-12 md:pb-16 md:pt-8 lg:px-20">
        {products.length > 0 ? (
          <Reveal
            stagger
            className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 md:gap-x-8 lg:grid-cols-4"
          >
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                categorySlug={category.slug}
                categoryName={category.name}
              />
            ))}
            {/* Closes every visible grid — the only door into "Otros Modelos".
                Omitted on that section's own page, where it would self-link. */}
            {category.slug !== OTHER_MODELS_SLUG && <OtherModelsCard />}
          </Reveal>
        ) : (
          <p className="py-16 text-center text-secondary">{t('category.empty')}</p>
        )}
      </section>

      {/* Related */}
      <section className="bg-surface px-6 py-14 md:px-12 md:py-20 lg:px-20">
        <h2 className="mb-12 font-serif text-[clamp(1.875rem,2.8vw,2.25rem)] font-light tracking-tight text-primary">
          {t('category.related')}
        </h2>
        <Reveal stagger className="grid grid-cols-1 gap-6 sm:grid-cols-3 lg:gap-8">
          {related.map((c) => (
            <CategoryCard key={c.slug} category={c} />
          ))}
        </Reveal>
        <div className="mt-14">
          <Button to="/catalogo" variant="outline">
            {t('common.viewAll')}
          </Button>
        </div>
      </section>
    </>
  );
}
