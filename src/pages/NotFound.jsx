import { useLanguage } from '../i18n/LanguageContext.jsx';
import Button from '../components/Button.jsx';

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-32 text-center">
      <p className="font-serif text-7xl font-light text-primary/30 md:text-9xl">404</p>
      <p className="mt-4 max-w-sm text-secondary">{t('notFound.text')}</p>
      <div className="mt-10">
        <Button to="/" variant="outline">
          {t('nav.home')}
        </Button>
      </div>
    </section>
  );
}
