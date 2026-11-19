import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useSettings } from '../settings/SettingsContext.jsx';
import Media from './Media.jsx';
import Button from './Button.jsx';

export default function BlackFridayHero() {
  const { t } = useLanguage();
  const { settings } = useSettings();
  const hero = settings.blackFridayHero;

  return (
    <section className="bf-hero" aria-label="Black Friday">
      <div className="bf-copy">
        <p className="bf-date">{t('blackFriday.until')}</p>
        <h1 className="bf-title" aria-label="Black Friday">
          <span>BLACK</span>
          <span>FRIDAY</span>
        </h1>
        <p className="bf-offer">{t('blackFriday.offer')}</p>
        <Button to="/catalogo" variant="solid" className="bf-cta">
          {t('blackFriday.cta')} <span aria-hidden="true">→</span>
        </Button>
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
