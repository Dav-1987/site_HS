import { Link, useParams } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useCatalog } from '../catalog/CatalogContext.jsx';
import Reveal from '../components/Reveal.jsx';
import Button from '../components/Button.jsx';
import ProductCard from '../components/ProductCard.jsx';
import CategoryCard from '../components/CategoryCard.jsx';
import NotFound from './NotFound.jsx';

export default function Category() {
  const { slug } = useParams();
  const { lang, t } = useLanguage();
  const { categories, getCategory, loaded } = useCatalog();
  const category = getCategory(slug);

  if (!category && !loaded) return null;
  if (!category) return <NotFound />;

  const related = categories.filter((c) => c.slug !== category.slug).slice(0, 3);

  return (
    <>
      {/* Header */}
      <section className="px-6 pt-6 md:px-12 md:pt-14 lg:px-20">
        <Link
          to="/catalogo"
          className="link-underline mb-6 inline-block text-xs uppercase tracking-[0.2em] text-secondary hover:text-primary"
        >
          ← {t('category.back')}
        </Link>

        <Reveal>
          <p className="mb-5 text-xs uppercase tracking-[0.3em] text-accent">
            {category.tagline[lang]}
          </p>
          <h1 className="font-serif text-5xl font-light leading-[1.02] tracking-tight text-primary md:text-7xl">
            {category.name[lang]}
          </h1>
          <p className="mt-7 max-w-lg text-base leading-relaxed text-secondary">
            {category.description[lang]}
          </p>
          <p className="mt-6 text-xs uppercase tracking-[0.2em] text-primary/40">
            {category.products.length} {t('category.products')}
          </p>
        </Reveal>
      </section>

      {/* Products */}
      <section className="px-6 pb-20 pt-10 md:px-12 md:pb-28 md:pt-16 lg:px-20">
        {category.products.length > 0 ? (
          <Reveal
            stagger
            className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 md:gap-x-8 lg:grid-cols-4"
          >
            {category.products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                categorySlug={category.slug}
                categoryName={category.name}
              />
            ))}
          </Reveal>
        ) : (
          <p className="py-16 text-center text-secondary">{t('category.empty')}</p>
        )}
      </section>

      {/* Related */}
      <section className="bg-surface px-6 py-20 md:px-12 md:py-28 lg:px-20">
        <h2 className="mb-12 font-serif text-3xl font-light tracking-tight text-primary md:text-4xl">
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
