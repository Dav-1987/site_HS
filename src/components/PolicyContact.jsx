import { useSettings } from '../settings/SettingsContext.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';

const LINK = 'text-primary underline transition-colors hover:text-accent-text';

/**
 * The "write or call us" block that closes the shipping and returns pages.
 * Both policies end the same way, and Merchant Center expects a reachable
 * contact on each — so the two pages share one implementation rather than
 * drifting apart the next time the phone number changes.
 */
export default function PolicyContact() {
  const { t } = useLanguage();
  const { settings } = useSettings();
  const { email, phone } = settings.contact;

  return (
    <p>
      {t('policy.contact')}{' '}
      <a href={`mailto:${email}`} className={LINK}>
        {email}
      </a>
      {' · '}
      <a href={`tel:${phone.replace(/\s/g, '')}`} className={LINK}>
        {phone}
      </a>
    </p>
  );
}
