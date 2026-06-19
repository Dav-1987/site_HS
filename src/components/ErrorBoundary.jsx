import { Component } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import Button from './Button.jsx';

function ErrorFallback() {
  const { t } = useLanguage();
  return (
    <section className="flex min-h-screen flex-col items-center justify-center px-6 py-32 text-center">
      <p className="font-serif text-3xl font-light text-primary">{t('error.boundary.title')}</p>
      <p className="mt-4 max-w-sm text-secondary">{t('error.boundary.body')}</p>
      <div className="mt-10">
        {/* Plain href, not router Link: the crash may have left the React
            tree (incl. providers a route relies on) in a broken state, so a
            full page reload is the only recovery that's guaranteed to work. */}
        <Button href="/" variant="outline">
          {t('nav.home')}
        </Button>
      </div>
    </section>
  );
}

/** Catches render errors anywhere below it so a crashing page shows a
 * recovery screen instead of a blank white page. */
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) return <ErrorFallback />;
    return this.props.children;
  }
}
