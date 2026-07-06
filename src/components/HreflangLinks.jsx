import { SITE } from '../seo/schema.js';
import { withLang } from '../i18n/routing.js';

/**
 * ES/EN/x-default <link rel="alternate" hreflang> trio for a page whose
 * canonical Spanish-form path is `esPath` (e.g. "/catalogo", `/${category.slug}`).
 * Spanish has no /en prefix and is the x-default (see src/i18n/routing.js).
 */
export default function HreflangLinks({ esPath }) {
  return (
    <>
      <link rel="alternate" hrefLang="es" href={`${SITE}${esPath}`} />
      <link rel="alternate" hrefLang="en" href={`${SITE}${withLang(esPath, 'en')}`} />
      <link rel="alternate" hrefLang="x-default" href={`${SITE}${esPath}`} />
    </>
  );
}
