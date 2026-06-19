import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useSettings } from '../settings/SettingsContext.jsx';
import Reveal from '../components/Reveal.jsx';
import SocialMeta from '../components/SocialMeta.jsx';

const SITE = 'https://hsmuebles.es';

export default function PrivacyPolicy() {
  const { t } = useLanguage();
  const { settings } = useSettings();
  const email = settings.contact.email;
  const [before, after] = t('privacy.p4').split('{email}');

  return (
    <>
      <title>{t('privacy.title')} | HS Muebles</title>
      <meta name="description" content={t('privacy.intro')} />
      <link rel="canonical" href={`${SITE}/privacy-policy`} />
      <SocialMeta
        title={`${t('privacy.title')} | HS Muebles`}
        description={t('privacy.intro')}
        url={`${SITE}/privacy-policy`}
      />
      <section className="px-6 pb-24 pt-8 md:px-12 md:pb-32 md:pt-12 lg:px-20">
        <Reveal className="max-w-xl">
          <h1 className="font-serif text-[clamp(2.5rem,4vw,3.25rem)] font-light leading-[1.05] tracking-tight text-primary">
            {t('privacy.title')}
          </h1>
        </Reveal>

        <Reveal delay={0.1} className="mt-10 max-w-xl space-y-5 text-sm leading-relaxed text-secondary">
          <p>{t('privacy.intro')}</p>
          <p>{t('privacy.p1')}</p>
          <p>{t('privacy.p2')}</p>
          <p>{t('privacy.p3')}</p>
          <p>
            {before}
            <a href={`mailto:${email}`} className="text-primary underline transition-colors hover:text-accent">
              {email}
            </a>
            {after}
          </p>
        </Reveal>
      </section>
    </>
  );
}
