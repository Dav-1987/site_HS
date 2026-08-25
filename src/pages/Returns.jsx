import { useLanguage } from '../i18n/LanguageContext.jsx';
import Reveal from '../components/Reveal.jsx';
import SocialMeta from '../components/SocialMeta.jsx';
import HreflangLinks from '../components/HreflangLinks.jsx';
import PolicyContact from '../components/PolicyContact.jsx';

const SITE = 'https://hsmuebles.es';

/**
 * Return policy. Required by Merchant Center alongside the shipping page, and
 * likewise not linked from the site yet — see Shipping.jsx.
 */
export default function Returns() {
  const { t, localize } = useLanguage();
  const esPath = '/devoluciones';
  const canonicalUrl = `${SITE}${localize(esPath)}`;

  return (
    <>
      <title>{`${t('returns.title')} | Mirage Muebles`}</title>
      <meta name="description" content={t('returns.intro')} />
      <link rel="canonical" href={canonicalUrl} />
      <HreflangLinks esPath={esPath} />
      <SocialMeta
        title={`${t('returns.title')} | Mirage Muebles`}
        description={t('returns.intro')}
        url={canonicalUrl}
      />
      <section className="px-6 pb-24 pt-8 md:px-12 md:pb-32 md:pt-12 lg:px-20">
        <Reveal className="max-w-xl">
          <h1 className="font-serif text-[clamp(2.5rem,4vw,3.25rem)] font-light leading-[1.05] tracking-tight text-primary">
            {t('returns.title')}
          </h1>
        </Reveal>

        <Reveal
          delay={0.1}
          className="mt-10 max-w-xl space-y-5 text-sm leading-relaxed text-secondary"
        >
          <p>{t('returns.intro')}</p>
          <p>{t('returns.condition')}</p>
          <p>{t('returns.how')}</p>
          <p>{t('returns.refund')}</p>
          <PolicyContact />
        </Reveal>
      </section>
    </>
  );
}
