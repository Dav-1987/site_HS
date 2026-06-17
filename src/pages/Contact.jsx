import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useSettings } from '../settings/SettingsContext.jsx';
import Reveal from '../components/Reveal.jsx';

function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
    </svg>
  );
}

function IconTikTok() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 shrink-0">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
    </svg>
  );
}

function IconWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 shrink-0">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.118.554 4.107 1.523 5.828L0 24l6.336-1.501A11.955 11.955 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.01-1.376l-.36-.214-3.724.882.933-3.614-.235-.372A9.818 9.818 0 0 1 2.182 12C2.182 6.573 6.573 2.182 12 2.182c5.428 0 9.818 4.391 9.818 9.818 0 5.428-4.39 9.818-9.818 9.818z"/>
    </svg>
  );
}

function IconPhone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6 6l.9-.9a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  );
}

function IconEmail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <polyline points="2,4 12,13 22,4"/>
    </svg>
  );
}

const SITE = 'https://hsmuebles.es';

export default function Contact() {
  const { t } = useLanguage();
  const { settings } = useSettings();
  const contact = settings.contact;
  const [emailCopied, setEmailCopied] = useState(false);

  const copyEmail = () => {
    navigator.clipboard.writeText(contact.email).then(() => {
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    });
  };

  const items = [
    contact.instagram && {
      icon: <IconInstagram />,
      label: 'Instagram',
      content: (
        <a href={contact.instagram} target="_blank" rel="noopener noreferrer"
          className="text-primary transition-colors hover:text-accent">
          @hs.muebles.es
        </a>
      ),
    },
    contact.tiktok && {
      icon: <IconTikTok />,
      label: 'TikTok',
      content: (
        <a href={contact.tiktok} target="_blank" rel="noopener noreferrer"
          className="text-primary transition-colors hover:text-accent">
          @hsmuebles
        </a>
      ),
    },
    contact.whatsapp && {
      icon: <IconWhatsApp />,
      label: 'WhatsApp',
      content: (
        <a href={contact.whatsapp} target="_blank" rel="noopener noreferrer"
          className="text-primary transition-colors hover:text-accent">
          {contact.phone}
        </a>
      ),
    },
    contact.phone && {
      icon: <IconPhone />,
      label: t('contact.info.hours'),
      content: (
        <a href={`tel:+34${contact.phone.replace(/\s/g, '')}`}
          className="text-primary transition-colors hover:text-accent">
          +34 {contact.phone}
        </a>
      ),
    },
    contact.email && {
      icon: <IconEmail />,
      label: 'Email',
      content: (
        <div className="relative inline-block">
          <button type="button" onClick={copyEmail}
            className="text-primary transition-colors hover:text-accent">
            {contact.email}
          </button>
          <span className={`pointer-events-none absolute -top-8 left-0 whitespace-nowrap rounded bg-primary px-2 py-1 text-[11px] text-background transition-all duration-200 ${emailCopied ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
            {t('footer.emailCopied')}
          </span>
        </div>
      ),
    },
  ].filter(Boolean);

  return (
    <>
      <title>Contacto | HS Muebles</title>
      <meta name="description" content="Contacta con HS Muebles: tienda de muebles minimalistas en España. Teléfono, email, Instagram y TikTok. Envío, montaje e instalación gratis." />
      <link rel="canonical" href={`${SITE}/contacto`} />
      <meta property="og:title" content="Contacto | HS Muebles" />
      <meta property="og:description" content="Contacta con HS Muebles. Envío, montaje e instalación gratis en toda España." />
      <meta property="og:url" content={`${SITE}/contacto`} />
      <meta property="og:type" content="website" />
      <section className="px-6 pb-24 pt-8 md:px-12 md:pb-32 md:pt-12 lg:px-20">
      <Reveal className="max-w-xl">
        <h1 className="font-serif text-[clamp(3rem,4.7vw,3.75rem)] font-light leading-[1.02] tracking-tight text-primary">
          {t('contact.title')}
        </h1>
        <p className="mt-5 text-base leading-relaxed text-secondary">
          {t('contact.subtitle')}
        </p>
      </Reveal>

      <Reveal delay={0.1} className="mt-14 max-w-lg">
        <dl className="divide-y divide-primary/10 border-t border-primary/10">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-5 py-5">
              <span className="text-accent">{item.icon}</span>
              <dt className="w-24 shrink-0 text-[11px] uppercase tracking-[0.2em] text-primary/40">
                {item.label}
              </dt>
              <dd className="text-sm">{item.content}</dd>
            </div>
          ))}
        </dl>
      </Reveal>
    </section>
    </>
  );
}
