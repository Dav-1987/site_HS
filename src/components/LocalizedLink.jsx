// Drop-in replacements for react-router-dom's Link/NavLink that automatically
// localize root-relative `to` paths ("/catalogo" -> "/en/catalogo" while
// lang === 'en'). Every internal nav link in the app renders through one of
// these, so page components can keep writing plain ES-form paths and never
// have to think about the /en prefix individually.
import { Link as RouterLink, NavLink as RouterNavLink } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext.jsx';

function localizeTo(to, lang) {
  if (typeof to === 'string' && to.startsWith('/')) return lang === 'en' ? `/en${to === '/' ? '' : to}` : to;
  if (to && typeof to === 'object' && typeof to.pathname === 'string') {
    return { ...to, pathname: localizeTo(to.pathname, lang) };
  }
  return to;
}

export function Link({ to, ...rest }) {
  const { lang } = useLanguage();
  return <RouterLink to={localizeTo(to, lang)} {...rest} />;
}

export function NavLink({ to, ...rest }) {
  const { lang } = useLanguage();
  return <RouterNavLink to={localizeTo(to, lang)} {...rest} />;
}
