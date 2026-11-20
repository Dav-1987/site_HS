import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useSettings } from '../settings/SettingsContext.jsx';
import { useCatalog } from '../catalog/CatalogContext.jsx';
import Media from './Media.jsx';
import Button from './Button.jsx';
import { homeCatalogLayouts } from '../data/settings.js';

export default function BlackFridayHero() {
  const { t } = useLanguage();
  const { settings } = useSettings();
  const { homeCatalogProducts } = useCatalog();
  const hero = settings.blackFridayHero;
  const date = t('blackFriday.until');
  const dateParts = date.split(/\s+(?=30\b)/);
  const offer = t('blackFriday.offer');
  const offerParts = offer.split(/\s+(?=(?:y regalos|and gifts)!?$)/i);
  const cta = t('blackFriday.cta');
  const ctaParts = cta.split(/\s+(?=(?:la promoción|the promotion)$)/i);
  const catalogLayouts = homeCatalogLayouts(settings.blocks);
  const targetFor = (shown) =>
    shown && homeCatalogProducts.length ? '/#home-catalog' : '/catalogo';
  const mobileTarget = targetFor(catalogLayouts.mobile);
  const desktopTarget = targetFor(catalogLayouts.desktop);
  const ctaContent = (
    <>
      {ctaParts.length === 2 ? (
        <span>
          {ctaParts[0]}
          <span className="bf-mobile-line"> {ctaParts[1]}</span>
        </span>
      ) : (
        cta
      )}{' '}
      <span aria-hidden="true">→</span>
    </>
  );

  return (
    <section className="bf-hero" aria-label="Black Friday">
      <div className="bf-copy">
        <p className="bf-date">
          {dateParts.length === 2 ? (
            <>
              {dateParts[0]}
              <span className="bf-mobile-line"> {dateParts[1]}</span>
            </>
          ) : (
            date
          )}
        </p>
        <h1 className="bf-title" aria-label="Black Friday">
          <span>BLACK</span>
          <span>FRIDAY</span>
        </h1>
        <p className="bf-offer">
          {offerParts.length === 2 ? (
            <>
              {offerParts[0]}
              <span className="bf-mobile-line"> {offerParts[1]}</span>
            </>
          ) : (
            offer
          )}
        </p>
        {mobileTarget === desktopTarget ? (
          <Button to={mobileTarget} variant="solid" className="bf-cta">
            {ctaContent}
          </Button>
        ) : (
          <>
            <Button to={mobileTarget} variant="solid" className="bf-cta md:hidden">
              {ctaContent}
            </Button>
            <Button to={desktopTarget} variant="solid" className="bf-cta hidden md:inline-flex">
              {ctaContent}
            </Button>
          </>
        )}
      </div>
      <div className="bf-photo">
        <div className="bf-image">
          <Media
            id={hero.image}
            idMobile={hero.imageMobile}
            alt={t('blackFriday.photoAlt')}
            w={1600}
            eager
          />
        </div>
      </div>
    </section>
  );
}
