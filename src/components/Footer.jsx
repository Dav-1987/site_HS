import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useCatalog } from '../catalog/CatalogContext.jsx';
import { useSettings } from '../settings/SettingsContext.jsx';

function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
    </svg>
  );
}

function IconTikTok() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
    </svg>
  );
}

function IconWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.118.554 4.107 1.523 5.828L0 24l6.336-1.501A11.955 11.955 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.01-1.376l-.36-.214-3.724.882.933-3.614-.235-.372A9.818 9.818 0 0 1 2.182 12C2.182 6.573 6.573 2.182 12 2.182c5.428 0 9.818 4.391 9.818 9.818 0 5.428-4.39 9.818-9.818 9.818z"/>
    </svg>
  );
}

function IconPhone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6 6l.9-.9a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  );
}

function IconEmail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <polyline points="2,4 12,13 22,4"/>
    </svg>
  );
}

export default function Footer() {
  const { lang, t } = useLanguage();
  const { categories } = useCatalog();
  const { settings } = useSettings();
  const contact = settings.contact;
  const year = new Date().getFullYear();
  const [emailCopied, setEmailCopied] = useState(false);

  const copyEmail = () => {
    navigator.clipboard.writeText(contact.email).then(() => {
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    });
  };

  return (
    <footer className="border-t border-primary/10 bg-background">
      <div className="px-6 pb-10 pt-20 md:px-12 md:pb-12 md:pt-28 lg:px-20">
        <div>
          {/* Brand + socials + contacts */}
          <div className="max-w-sm">
            <Link to="/" className="flex items-center gap-3 font-serif text-3xl tracking-tight text-primary">
              <img src="/logo-hs.png" alt="" className="h-9 w-9" />
              <span className="text-accent">Muebles</span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-secondary">
              {t('footer.tagline')}
            </p>

            {/* Social icons */}
            <div className="mt-6 flex items-center gap-4">
              {contact.instagram && (
                <a href={contact.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-secondary transition-colors duration-300 hover:text-accent">
                  <IconInstagram />
                </a>
              )}
              {contact.tiktok && (
                <a href={contact.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="text-secondary transition-colors duration-300 hover:text-accent">
                  <IconTikTok />
                </a>
              )}
              {contact.whatsapp && (
                <a href={contact.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="text-secondary transition-colors duration-300 hover:text-accent">
                  <IconWhatsApp />
                </a>
              )}
            </div>

            {/* Phone */}
            {contact.phone && (
              <a href={`tel:+34${contact.phone.replace(/\s/g, '')}`} className="mt-4 flex items-center gap-2 text-sm text-secondary transition-colors duration-300 hover:text-accent">
                <IconPhone />
                {contact.phone}
              </a>
            )}

            {/* Email — click to copy */}
            {contact.email && (
              <div className="relative mt-3 inline-block">
                <button
                  type="button"
                  onClick={copyEmail}
                  className="flex items-center gap-2 text-sm text-secondary transition-colors duration-300 hover:text-accent"
                >
                  <IconEmail />
                  {contact.email}
                </button>
                <span
                  className={`pointer-events-none absolute -top-8 left-0 whitespace-nowrap rounded bg-primary px-2 py-1 text-[11px] text-background transition-all duration-200 ${
                    emailCopied ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
                  }`}
                >
                  {t('footer.emailCopied')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-primary/10 pt-8 text-xs text-primary/40 md:flex-row md:items-center">
          <p>
            © {year} HS Muebles. {t('footer.rights')}
          </p>
          <div className="flex gap-6">
            <Link to="/legal-notice" className="transition-colors hover:text-accent">
              {t('footer.legal')}
            </Link>
            <Link to="/privacy-policy" className="transition-colors hover:text-accent">
              {t('footer.privacy')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
