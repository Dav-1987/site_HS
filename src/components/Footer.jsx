import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useCatalog } from '../catalog/CatalogContext.jsx';

const SOCIALS = ['Instagram', 'Pinterest', 'Behance'];

export default function Footer() {
  const { lang, t } = useLanguage();
  const { categories } = useCatalog();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-primary/10 bg-background">
      <div className="px-6 py-20 md:px-12 md:py-28 lg:px-20">
        <div className="grid grid-cols-1 gap-14 md:grid-cols-12">
          {/* Brand + newsletter */}
          <div className="md:col-span-5">
            <Link to="/" className="font-serif text-3xl tracking-tight text-primary">
              HS <span className="text-accent">Muebles</span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-secondary">
              {t('footer.tagline')}
            </p>

            <form
              className="mt-8 flex max-w-sm items-center border-b border-primary/20 focus-within:border-accent"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                required
                placeholder={t('footer.newsletter.placeholder')}
                aria-label={t('footer.newsletter.placeholder')}
                className="w-full bg-transparent py-3 text-sm text-primary placeholder:text-primary/40 focus:outline-none"
              />
              <button
                type="submit"
                className="shrink-0 py-3 text-xs uppercase tracking-[0.2em] text-primary transition-colors hover:text-accent"
              >
                {t('footer.newsletter.button')}
              </button>
            </form>
          </div>

          {/* Explore */}
          <nav className="md:col-span-3 md:col-start-7" aria-label={t('footer.explore')}>
            <h4 className="mb-5 text-xs uppercase tracking-[0.25em] text-primary/40">
              {t('footer.explore')}
            </h4>
            <ul className="space-y-3 text-sm">
              {categories.slice(0, 6).map((c) => (
                <li key={c.slug}>
                  <Link
                    to={`/categoria/${c.slug}`}
                    className="text-secondary transition-colors duration-300 hover:text-accent"
                  >
                    {c.name[lang]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Company + social */}
          <div className="md:col-span-3">
            <h4 className="mb-5 text-xs uppercase tracking-[0.25em] text-primary/40">
              {t('footer.company')}
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/catalogo" className="text-secondary transition-colors hover:text-accent">
                  {t('nav.catalog')}
                </Link>
              </li>
              <li>
                <Link to="/#nosotros" className="text-secondary transition-colors hover:text-accent">
                  {t('nav.about')}
                </Link>
              </li>
              <li>
                <Link to="/contacto" className="text-secondary transition-colors hover:text-accent">
                  {t('nav.contact')}
                </Link>
              </li>
            </ul>

            <h4 className="mb-4 mt-8 text-xs uppercase tracking-[0.25em] text-primary/40">
              {t('footer.follow')}
            </h4>
            <ul className="space-y-3 text-sm">
              {SOCIALS.map((s) => (
                <li key={s}>
                  <a
                    href="#"
                    className="text-secondary transition-colors duration-300 hover:text-accent"
                  >
                    {s}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-primary/10 pt-8 text-xs text-primary/40 md:flex-row md:items-center">
          <p>
            © {year} HS Muebles. {t('footer.rights')}
          </p>
          <div className="flex gap-6">
            <a href="#" className="transition-colors hover:text-accent">
              {t('footer.legal')}
            </a>
            <a href="#" className="transition-colors hover:text-accent">
              {t('footer.privacy')}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
