import { useCatalog } from '../../catalog/CatalogContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import ProductCard from '../ProductCard.jsx';
import Button from '../Button.jsx';
import { guideProducts } from '../../data/guides.js';

/**
 * «Modelos que encajan»: the article's models, chosen by its rule against the
 * catalog as listings see it (guideProducts), so a model taken off the site
 * leaves every article by itself. Ends with a way into the collection the rule
 * names; nothing at all when the article asks for no models.
 */
export default function GuideProducts({ rule }) {
  const { lang, t } = useLanguage();
  const { categories } = useCatalog();
  const entries = guideProducts(categories, rule);
  const collection = categories.find((c) => c.slug === rule?.category);
  if (!entries.length && !collection) return null;

  return (
    <section
      aria-labelledby="guide-models"
      className="bg-surface px-6 py-14 md:px-12 md:py-20 lg:px-20"
    >
      <h2
        id="guide-models"
        className="font-serif text-[clamp(1.875rem,2.8vw,2.25rem)] font-light tracking-tight text-primary"
      >
        {t('guides.models')}
      </h2>
      {entries.length > 0 && (
        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4 md:gap-x-8">
          {entries.map(({ product, category }) => (
            <ProductCard
              key={product.id}
              product={product}
              categorySlug={category.slug}
              categoryName={category.name}
            />
          ))}
        </div>
      )}
      {collection && (
        <div className="mt-12">
          <Button to={`/${collection.slug}`} variant="outline">
            {t('guides.models.more').replace('{name}', collection.name[lang] ?? collection.name.es)}
          </Button>
        </div>
      )}
    </section>
  );
}
