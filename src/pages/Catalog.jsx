import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useCatalog } from '../catalog/CatalogContext.jsx';
import Reveal from '../components/Reveal.jsx';
import CategoryCard from '../components/CategoryCard.jsx';

export default function Catalog() {
  const { t } = useLanguage();
  const { categories } = useCatalog();

  return (
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
  );
}
