import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useSettings } from '../settings/SettingsContext.jsx';
import Reveal from '../components/Reveal.jsx';
import SocialMeta from '../components/SocialMeta.jsx';

const SITE = 'https://hsmuebles.es';

export default function LegalNotice() {
  const { t } = useLanguage();
  const { settings } = useSettings();
  const email = settings.contact.email;
  const [before, after] = t('legal.p3').split('{email}');

  return (
    <>
      <title>{t('legal.title')} | HS Muebles</title>
      <meta name="description" content={t('legal.p1')} />
      <link rel="canonical" href={`${SITE}/legal-notice`} />
      <SocialMeta
        title={`${t('legal.title')} | HS Muebles`}
        description={t('legal.p1')}
        url={`${SITE}/legal-notice`}
      />
      <section className="px-6 pb-24 pt-8 md:px-12 md:pb-32 md:pt-12 lg:px-20">
        <Reveal className="max-w-xl">
          <h1 className="font-serif text-[clamp(2.5rem,4vw,3.25rem)] font-light leading-[1.05] tracking-tight text-primary">
            {t('legal.title')}
          </h1>
        </Reveal>

        <Reveal delay={0.1} className="mt-10 max-w-xl">
          <dl className="divide-y divide-primary/10 border-t border-primary/10">
            <div className="flex items-center gap-5 py-4">
              <dt className="w-28 shrink-0 text-[11px] uppercase tracking-[0.2em] text-primary/40">
                {t('legal.companyLabel')}
              </dt>
              <dd className="text-sm text-primary">HS Muebles</dd>
            </div>
            <div className="flex items-center gap-5 py-4">
              <dt className="w-28 shrink-0 text-[11px] uppercase tracking-[0.2em] text-primary/40">
                {t('legal.website')}
              </dt>
              <dd className="text-sm">
                <a href={SITE} className="text-primary transition-colors hover:text-accent">
                  hsmuebles.es
                </a>
              </dd>
            </div>
            <div className="flex items-center gap-5 py-4">
              <dt className="w-28 shrink-0 text-[11px] uppercase tracking-[0.2em] text-primary/40">
                {t('legal.email')}
              </dt>
              <dd className="text-sm">
                <a href={`mailto:${email}`} className="text-primary transition-colors hover:text-accent">
                  {email}
                </a>
              </dd>
            </div>
          </dl>

          <div className="mt-8 space-y-5 text-sm leading-relaxed text-secondary">
            <p>{t('legal.p1')}</p>
            <p>{t('legal.p2')}</p>
            <p>
              {before}
              <a href={`mailto:${email}`} className="text-primary underline transition-colors hover:text-accent">
                {email}
              </a>
              {after}
            </p>
          </div>
        </Reveal>
      </section>
    </>
  );
}
