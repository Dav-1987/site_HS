// The text of a «Guías» article: Markdown as it is written in /admin, turned
// into the HTML its page shows. scripts/pull-guides.mjs runs this at build time
// — the site ships the HTML, not a parser — and the admin's preview runs the
// same thing, so what the owner sees there is what the page will be.
//
// Raw HTML in the text is shown as text, never as markup (`html: false`), and
// markdown-it refuses javascript:, vbscript: and data: links by itself.

import MarkdownIt from 'markdown-it';
import { resolveImage } from '../data/catalog.js';
import { withLang } from '../i18n/routing.js';

const md = new MarkdownIt({ html: false, linkify: false, typographer: false });

/** "¿Qué fondo debe tener un tocador?" → "que-fondo-debe-tener-un-tocador". */
export function headingId(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// The page carries the one <h1> — a "#" in the text becomes a section heading
// like "##" — and anything below "###" is folded into it: the article stays a
// flat list of sections, which is what its table of contents lists.
const HEADING_LEVEL = { h1: 'h2', h2: 'h2', h3: 'h3', h4: 'h3', h5: 'h3', h6: 'h3' };

md.core.ruler.push('guide_headings', (state) => {
  const { tokens, env } = state;
  const used = new Set();
  env.toc = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type !== 'heading_open' && token.type !== 'heading_close') continue;
    token.tag = HEADING_LEVEL[token.tag];
    if (token.type !== 'heading_open' || token.tag !== 'h2') continue;

    const text = tokens[i + 1]?.children
      ?.filter((child) => child.type === 'text' || child.type === 'code_inline')
      .map((child) => child.content)
      .join('')
      .trim();
    const base = headingId(text ?? '') || 'seccion';
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    token.attrSet('id', id);
    env.toc.push({ id, text });
  }
});

// Paths of the site are written in their Spanish form ("/tocadores/…") in both
// languages; the English text sends its readers to the English pages.
function localHref(href, lang) {
  if (lang !== 'en' || href.startsWith('/en/') || href === '/en') return href;
  if (href.startsWith('/uploads/')) return href;
  return withLang(href, 'en');
}

const renderToken = (tokens, idx, options, env, self) => self.renderToken(tokens, idx, options);

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const href = token.attrGet('href') ?? '';
  if (href.startsWith('/') && !href.startsWith('//')) {
    token.attrSet('href', localHref(href, env.lang));
  } else if (/^https?:\/\//.test(href)) {
    token.attrSet('target', '_blank');
    token.attrSet('rel', 'noopener noreferrer');
  }
  return renderToken(tokens, idx, options, env, self);
};

// A photo uploaded in /admin is served in three pre-made WebP sizes beside the
// original (server/index.js, generateWebpVariants); the text column is never
// wider than 42rem. The default rule still renders it: it is what turns the
// "![alt]" part into the alt attribute.
const renderImage = md.renderer.rules.image;
md.renderer.rules.image = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const src = token.attrGet('src') ?? '';
  if (src.startsWith('/uploads/')) {
    const base = src.replace(/\.[^.]+$/, '');
    token.attrSet('src', resolveImage(src, 900));
    token.attrSet(
      'srcset',
      `${base}_400.webp 400w, ${base}_800.webp 800w, ${base}_1600.webp 1600w`,
    );
    token.attrSet('sizes', '(min-width: 768px) 42rem, 100vw');
  }
  token.attrSet('loading', 'lazy');
  token.attrSet('decoding', 'async');
  return renderImage(tokens, idx, options, env, self);
};

// A table wider than a phone scrolls inside its own box instead of the page.
md.renderer.rules.table_open = () => '<div class="guide-table"><table>\n';
md.renderer.rules.table_close = () => '</table></div>\n';

/**
 * The article's text as HTML, plus its table of contents — the `##` sections
 * as `{ id, text }`, each id set on its heading for the contents to link to.
 */
export function renderGuideMarkdown(source, lang = 'es') {
  const env = { lang };
  const html = md.render(source ?? '', env);
  return { html, toc: env.toc ?? [] };
}
