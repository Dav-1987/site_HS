import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { LANGUAGES } from '../i18n/translations.js';
import { useCatalog } from '../catalog/CatalogContext.jsx';
import { useCart } from '../cart/CartContext.jsx';
import { cartCount, cartLines } from '../cart/cartUtils.js';

function CartLink() {
  const { t } = useLanguage();
  const { items } = useCart();
  const { categories } = useCatalog();
  // Count only lines that resolve against the live catalog, so the badge
  // always matches what the cart page actually shows.
  const count = cartCount(cartLines(items, categories));
  return (
    <Link
      to="/carrito"
      aria-label={count > 0 ? `${t('nav.cart')} (${count})` : t('nav.cart')}
      className="relative flex h-10 w-10 items-center justify-center text-primary transition-colors duration-300 hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
        className="h-5 w-5"
      >
        <path d="M5.5 8h13l-1.2 12.5h-10.6L5.5 8Z" />
        <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
      </svg>
      {count > 0 && (
        <span className="absolute right-0 top-0 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium leading-none text-background">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

function LangToggle({ className = '' }) {
  const { lang, setLang } = useLanguage();
  return (
    <div className={`flex items-center gap-2 text-xs uppercase tracking-[0.2em] ${className}`}>
      {LANGUAGES.map((l, i) => (
        <span key={l.code} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLang(l.code)}
            aria-label={`${l.label}`}
            aria-pressed={lang === l.code}
            className={`transition-colors duration-300 ${
              lang === l.code ? 'text-accent' : 'text-primary/70 hover:text-primary'
            }`}
          >
            {l.label}
          </button>
          {i === 0 && <span className="text-primary/40">/</span>}
        </span>
      ))}
    </div>
  );
}

export default function Header() {
  const { lang, t } = useLanguage();
  const { categories } = useCatalog();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  // Transparent only at the very top of the home page; solid everywhere else.
  const isHome = location.pathname === '/';
  const transparent = isHome && !scrolled;

  // Track scroll position to toggle the solid/transparent header state.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menus on navigation.
  useEffect(() => {
    setMobileOpen(false);
    setCatOpen(false);
  }, [location]);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const navLinkClass = ({ isActive }) =>
    `link-underline text-xs uppercase tracking-[0.2em] py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 ${
      isActive ? 'text-primary' : 'text-primary hover:text-primary'
    }`;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 text-primary transition-colors duration-500 ${
        transparent
          ? 'bg-transparent'
          : 'border-b border-primary/10 bg-background/90 backdrop-blur-md'
      }`}
    >
      <div className="flex h-14 items-center justify-between px-6 md:px-12 lg:h-20 lg:px-20">
        <Link
          to="/"
          className="font-serif text-xl tracking-tight text-primary md:text-2xl"
          aria-label="HS Muebles"
        >
          HS <span className="text-accent">Muebles</span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-10 lg:flex" aria-label={t('nav.menu')}>
          <NavLink to="/" className={navLinkClass} end>
            {t('nav.home')}
          </NavLink>

          <div className="group relative">
            <NavLink to="/catalogo" className={navLinkClass}>
              {t('nav.catalog')}
            </NavLink>
            {/* Dropdown */}
            <div className="invisible absolute left-1/2 top-full z-50 w-[34rem] -translate-x-1/2 pt-5 opacity-0 transition-all duration-300 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <div className="grid grid-cols-2 gap-x-8 border border-primary/10 bg-background p-6 shadow-floating">
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    to={`/${c.slug}`}
                    className="group/item flex items-center justify-between border-b border-primary/5 py-2.5 text-sm text-primary/70 transition-colors duration-300 hover:text-accent focus-visible:outline-none focus-visible:text-accent"
                  >
                    <span>{c.name[lang]}</span>
                    <span
                      aria-hidden="true"
                      className="text-[10px] opacity-0 transition-opacity duration-300 group-hover/item:opacity-60"
                    >
                      →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <Link
            to="/#nosotros"
            className="link-underline py-1 text-xs uppercase tracking-[0.2em] text-primary hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {t('nav.about')}
          </Link>
          <NavLink to="/contacto" className={navLinkClass}>
            {t('nav.contact')}
          </NavLink>
        </nav>

        <div className="flex items-center gap-3 md:gap-5">
          <LangToggle className="flex" />
          <CartLink />

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? t('nav.close') : t('nav.menu')}
            aria-expanded={mobileOpen}
            className="flex h-10 w-10 flex-col items-center justify-center gap-[5px] lg:hidden"
          >
            <span
              className={`h-px w-6 bg-primary transition-transform duration-300 ${
                mobileOpen ? 'translate-y-[6px] rotate-45' : ''
              }`}
            />
            <span
              className={`h-px w-6 bg-primary transition-opacity duration-300 ${
                mobileOpen ? 'opacity-0' : ''
              }`}
            />
            <span
              className={`h-px w-6 bg-primary transition-transform duration-300 ${
                mobileOpen ? '-translate-y-[6px] -rotate-45' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`fixed inset-x-0 top-14 z-40 overflow-y-auto bg-background transition-opacity duration-300 lg:hidden ${
          mobileOpen ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
        style={{ height: mobileOpen ? 'calc(100dvh - 3.5rem)' : 0 }}
      >
        <nav className="flex flex-col px-6 py-8" aria-label={t('nav.menu')}>
          <NavLink to="/" className="border-b border-primary/10 py-4 font-serif text-2xl font-light">
            {t('nav.home')}
          </NavLink>

          <button
            type="button"
            onClick={() => setCatOpen((v) => !v)}
            aria-expanded={catOpen}
            className="flex items-center justify-between border-b border-primary/10 py-4 text-left font-serif text-2xl font-light"
          >
            {t('nav.catalog')}
            <span
              className={`text-base transition-transform duration-300 ${catOpen ? 'rotate-45' : ''}`}
              aria-hidden="true"
            >
              +
            </span>
          </button>
          {catOpen && (
            <div className="flex flex-col border-b border-primary/10 py-2">
              <Link to="/catalogo" className="py-2 text-sm uppercase tracking-[0.15em] text-accent">
                {t('common.viewAll')}
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  to={`/${c.slug}`}
                  className="py-2 text-base text-primary/70"
                >
                  {c.name[lang]}
                </Link>
              ))}
            </div>
          )}

          <Link
            to="/#nosotros"
            className="border-b border-primary/10 py-4 font-serif text-2xl font-light"
          >
            {t('nav.about')}
          </Link>
          <NavLink
            to="/contacto"
            className="border-b border-primary/10 py-4 font-serif text-2xl font-light"
          >
            {t('nav.contact')}
          </NavLink>

        </nav>
      </div>
    </header>
  );
}
