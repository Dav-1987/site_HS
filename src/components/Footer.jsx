import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Link } from './LocalizedLink.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useSettings } from '../settings/SettingsContext.jsx';
import IconWhatsApp from './IconWhatsApp.jsx';
import { GUIDES } from '../guides/content.js';
import { GUIDES_SLUG } from '../data/guides.js';
import { stripLangPrefix } from '../i18n/routing.js';
import { handleFromUrl } from '../lib/contact.js';

function IconInstagram() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconTikTok() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6 6l.9-.9a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconEmail() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="2,4 12,13 22,4" />
    </svg>
  );
}

export default function Footer() {
  const { t } = useLanguage();
  const { settings } = useSettings();
  const contact = settings.contact;
  const isHome = stripLangPrefix(useLocation().pathname).path === '/';
  const year = new Date().getFullYear();
  const [emailCopied, setEmailCopied] = useState(false);
  const phoneDigits = contact.phone?.replace(/\s/g, '') || '';
  const phoneHref = phoneDigits.startsWith('+') ? phoneDigits : `+34${phoneDigits}`;

  const copyEmail = () => {
    if (!navigator.clipboard) return;
    navigator.clipboard
      .writeText(contact.email)
      .then(() => {
        setEmailCopied(true);
        setTimeout(() => setEmailCopied(false), 2000);
      })
      .catch(() => {});
  };

  return (
    <footer
      id={isHome ? 'home-contacts' : undefined}
      className="scroll-mt-[calc(5rem+var(--promo-h,0px))] border-t border-primary/10 bg-background"
    >
      <div className="px-6 pb-10 pt-20 md:px-12 md:pb-12 md:pt-28 lg:px-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Brand */}
          <div className="max-w-sm">
            <Link
              to="/"
              className="flex items-center gap-3 font-serif text-3xl tracking-tight text-primary"
            >
              <img
                src="/logo-mirage.png"
                alt=""
                width="438"
                height="339"
                className="h-9 w-auto object-contain"
              />
              <span className="text-accent-text">Mirage Muebles</span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-secondary">
              {t('footer.tagline')}
            </p>
          </div>
          <section aria-label={t('nav.contact')} className="max-w-lg">
            <h2 className="font-serif text-3xl font-light text-primary">{t('nav.contact')}</h2>
            <dl className="mt-5 divide-y divide-primary/10 border-t border-primary/10">
              {[
                contact.instagram && {
                  label: 'Instagram',
                  icon: <IconInstagram />,
                  href: contact.instagram,
                  value: handleFromUrl(contact.instagram),
                },
                contact.tiktok && {
                  label: 'TikTok',
                  icon: <IconTikTok />,
                  href: contact.tiktok,
                  value: handleFromUrl(contact.tiktok),
                },
                contact.whatsapp && {
                  label: 'WhatsApp',
                  icon: <IconWhatsApp />,
                  href: contact.whatsapp,
                  value: contact.phone || contact.whatsapp,
                },
                contact.phone && {
                  label: 'Tel',
                  icon: <IconPhone />,
                  href: `tel:${phoneHref}`,
                  value: phoneDigits.startsWith('+') ? contact.phone : `+34 ${contact.phone}`,
                },
              ]
                .filter(Boolean)
                .map(({ label, icon, href, value }) => (
                  <div key={label} className="flex min-h-14 items-center gap-4 py-2 text-sm">
                    <span aria-hidden="true" className="w-5 shrink-0 text-accent-text">
                      {icon}
                    </span>
                    <dt className="w-20 shrink-0 text-xs uppercase tracking-[0.15em] text-secondary">
                      {label}
                    </dt>
                    <dd className="min-w-0 break-all">
                      <a
                        href={href}
                        {...(href.startsWith('http')
                          ? { target: '_blank', rel: 'noopener noreferrer' }
                          : {})}
                        className="text-primary transition-colors hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        {value}
                      </a>
                    </dd>
                  </div>
                ))}
              {contact.email && (
                <div className="flex min-h-14 items-center gap-4 py-2 text-sm">
                  <span aria-hidden="true" className="w-5 shrink-0 text-accent-text">
                    <IconEmail />
                  </span>
                  <dt className="w-20 shrink-0 text-xs uppercase tracking-[0.15em] text-secondary">
                    Email
                  </dt>
                  <dd className="relative min-w-0 break-all">
                    <button
                      type="button"
                      onClick={copyEmail}
                      className="text-left text-primary transition-colors hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      {contact.email}
                    </button>
                    <span
                      role="status"
                      className="absolute -top-7 left-0 whitespace-nowrap text-xs text-accent-text"
                    >
                      {emailCopied ? t('footer.emailCopied') : ''}
                    </span>
                  </dd>
                </div>
              )}
            </dl>
            {contact.phone && (
              <p className="mt-4 text-xs text-secondary">{t('contact.info.hours')}</p>
            )}
          </section>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-primary/10 pt-8 text-xs text-secondary md:flex-row md:items-center">
          <p>
            © {year} Mirage Muebles. {t('footer.rights')}
          </p>
          {/* Shipping and returns sit here, not only in the sitemap: a buyer has
              to be able to find what delivery costs and how to return a piece
              from any page, and Pinterest's merchant guidelines require a
              return policy that is easy to find. Both pages existed before
              this and were reachable by URL only. */}
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {GUIDES.length > 0 && (
              <Link to={`/${GUIDES_SLUG}`} className="transition-colors hover:text-accent-text">
                {t('nav.guides')}
              </Link>
            )}
            <Link to="/envios" className="transition-colors hover:text-accent-text">
              {t('footer.shipping')}
            </Link>
            <Link to="/devoluciones" className="transition-colors hover:text-accent-text">
              {t('footer.returns')}
            </Link>
            <Link to="/legal-notice" className="transition-colors hover:text-accent-text">
              {t('footer.legal')}
            </Link>
            <Link to="/privacy-policy" className="transition-colors hover:text-accent-text">
              {t('footer.privacy')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
