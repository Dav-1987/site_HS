// Pure URL <-> language helpers — no React, no JSX. Shared by client code
// (LanguageContext, LocalizedLink, Header) AND the node build scripts
// (scripts/prerender.mjs, scripts/generate-sitemap.mjs), so the "what does an
// English URL look like" rule lives in exactly one place.
//
// Scheme: Spanish is the default and stays unprefixed (/catalogo); English
// mirrors the same path under /en (/en/catalogo). Slugs are NOT translated.

export function withLang(path, lang) {
  if (lang !== 'en') return path;
  return path === '/' ? '/en' : `/en${path}`;
}

export function stripLangPrefix(pathname) {
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    return { lang: 'en', path: pathname.slice(3) || '/' };
  }
  return { lang: 'es', path: pathname };
}
