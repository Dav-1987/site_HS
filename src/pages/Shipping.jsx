import { useLanguage } from '../i18n/LanguageContext.jsx';
import Reveal from '../components/Reveal.jsx';
import SocialMeta from '../components/SocialMeta.jsx';
import HreflangLinks from '../components/HreflangLinks.jsx';
import PolicyContact from '../components/PolicyContact.jsx';

const SITE = 'https://hsmuebles.es';

/**
 * Shipping policy. Required by Merchant Center: the delivery terms set in the
 * account have to be backed by a page on the site. Deliberately not linked from
 * anywhere on the site yet — it exists at its own address and in the sitemap.
 */
export default function Shipping() {
  const { t, localize } = useLanguage();
  const esPath = '/envios';
  const canonicalUrl = `${SITE}${localize(esPath)}`;

  return (
    <>
      <title>{`${t('shipping.title')} | Mirage Muebles`}</title>
      <meta name="description" content={t('shipping.intro')} />
      <link rel="canonical" href={canonicalUrl} />
      <HreflangLinks esPath={esPath} />
      <SocialMeta
        title={`${t('shipping.title')} | Mirage Muebles`}
        description={t('shipping.intro')}
        url={canonicalUrl}
      />
      <section className="px-6 pb-24 pt-8 md:px-12 md:pb-32 md:pt-12 lg:px-20">
        <Reveal className="max-w-xl">
          <h1 className="font-serif text-[clamp(2.5rem,4vw,3.25rem)] font-light leading-[1.05] tracking-tight text-primary">
            {t('shipping.title')}
          </h1>
        </Reveal>

        <Reveal
          delay={0.1}
          className="mt-10 max-w-xl space-y-5 text-sm leading-relaxed text-secondary"
        >
          <p>{t('shipping.intro')}</p>
          <p>{t('shipping.cost')}</p>
          <p>{t('shipping.time')}</p>
          <p>{t('shipping.how')}</p>
          <PolicyContact />
        </Reveal>
      </section>
    </>
  );
}
