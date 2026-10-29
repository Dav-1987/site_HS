// What the article editor in /admin checks while the owner types: what
// publishing still needs, whether the searches the article is written for are
// where search engines and AI assistants read first, words about the shop's
// own service (the articles stay neutral — the owner's rule), and links to
// models that are no longer on the site. Pure; the editor only shows it.

import { GUIDE_LANGS, missingForPublish } from '../data/guides.js';
import { findProduct, isListed, isOff } from '../data/catalog.js';

const LANG_NAMES = { es: 'испанский', en: 'английский' };
const FIELD_NAMES = {
  title: 'заголовок',
  description: 'описание для Google',
  answer: 'короткий ответ',
  body: 'текст',
};

/**
 * What publishing still needs, in Russian: "английский: текст, короткий
 * ответ" — one line per language that lacks something.
 */
export function missingLines(guide) {
  const byLang = new Map();
  for (const path of missingForPublish(guide)) {
    const [lang, field, n] = path.split('.');
    const name =
      field === 'faq' ? `вопрос ${n} без ответа или ответ без вопроса` : FIELD_NAMES[field];
    byLang.set(lang, [...(byLang.get(lang) ?? []), name]);
  }
  return GUIDE_LANGS.filter((lang) => byLang.has(lang)).map(
    (lang) => `${LANG_NAMES[lang]}: ${byLang.get(lang).join(', ')}`,
  );
}

// Case, accents and spacing aside: "Tocador pequeño" is in "TOCADOR PEQUENO".
const fold = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/**
 * For each search the article targets, whether it is in the three places read
 * first: the title, the description Google shows and the short answer that
 * opens the page.
 */
export function keywordCoverage(block) {
  const where = {
    title: fold(block?.title),
    description: fold(block?.description),
    answer: fold(block?.answer),
  };
  return (block?.keywords ?? []).map((keyword) => {
    const k = fold(keyword);
    return {
      keyword,
      title: where.title.includes(k),
      description: where.description.includes(k),
      answer: where.answer.includes(k),
    };
  });
}

// The articles answer questions; delivery, assembly, payment and returns are
// the shop's business pages, not theirs (the owner's rule for the section).
const SERVICE_WORDS = {
  es: [
    'envío',
    'envíos',
    'entrega',
    'montaje',
    'devolución',
    'devoluciones',
    'bizum',
    'plazo de entrega',
    'gastos de envío',
  ],
  en: ['shipping', 'delivery', 'assembly service', 'refund', 'bizum'],
};

/** The service words in a language's text, as written in the list above. */
export function serviceMentions(block, lang) {
  const all = fold(
    [block?.title, block?.description, block?.answer, block?.body]
      .concat((block?.faq ?? []).flatMap((item) => [item.q, item.a]))
      .join(' '),
  );
  return (SERVICE_WORDS[lang] ?? []).filter((word) =>
    new RegExp(`(^|[^a-z])${fold(word)}([^a-z]|$)`).test(all),
  );
}

const LINK_RE = /\]\((\/(?:en\/)?([a-z0-9-]+)\/([A-Za-z0-9-]+))\)/g;

/**
 * Links in the text to a model that is gone or off the site: `{ href, why }`.
 * The site still sends such a link somewhere (server/redirects.js), but not to
 * the model the text talks about.
 */
export function brokenProductLinks(body, categories) {
  const broken = [];
  for (const [, href, slug, id] of String(body ?? '').matchAll(LINK_RE)) {
    if (slug === 'guias') continue;
    const found = findProduct(categories ?? [], id);
    if (!found) broken.push({ href, why: 'такого товара нет в каталоге' });
    else if (isOff(found.product) || isOff(found.category))
      broken.push({ href, why: 'товар снят с сайта' });
    else if (found.category.slug !== slug)
      broken.push({ href, why: `товар теперь в разделе «${found.category.slug}»` });
    else if (!isListed(found.product) || !isListed(found.category))
      broken.push({
        href,
        why: 'товар скрыт из списков — страница открывается, но в каталоге её нет',
      });
  }
  return broken;
}
