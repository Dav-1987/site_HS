import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useCatalog } from '../catalog/CatalogContext.jsx';
import Reveal from '../components/Reveal.jsx';
import CategoryCard from '../components/CategoryCard.jsx';

export default function Catalog() {
  const { t } = useLanguage();
  const { categories } = useCatalog();

  return (
    <section className="px-6 pb-24 pt-8 md:px-12 md:pb-32 md:pt-20 lg:px-20">
      <Reveal className="mb-10 max-w-3xl md:mb-16">
        <p className="mb-5 text-xs uppercase tracking-[0.3em] text-accent">
          {t('catalog.eyebrow')}
        </p>
        <h1 className="font-serif text-5xl font-light leading-[1.02] tracking-tight text-primary md:text-7xl">
          {t('catalog.title')}
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-secondary">
          {t('catalog.subtitle')}
        </p>
      </Reveal>

      <Reveal stagger className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
        {categories.map((c) => (
          <CategoryCard key={c.slug} category={c} />
        ))}
      </Reveal>
    </section>
  );
}
