import { use } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Link } from '../components/LocalizedLink.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import Media from '../components/Media.jsx';
import JsonLd from '../components/JsonLd.jsx';
import SocialMeta from '../components/SocialMeta.jsx';
import HreflangLinks from '../components/HreflangLinks.jsx';
import GuideCard from '../components/guide/GuideCard.jsx';
import GuideProducts from '../components/guide/GuideProducts.jsx';
import NotFound from './NotFound.jsx';
import { GUIDES, findGuide, guideDate, loadGuideArticle } from '../guides/content.js';
import { GUIDES_SLUG } from '../data/guides.js';
import { GUIDE_PROSE } from '../guides/prose.js';
import { resolveImage } from '../data/catalog.js';
import { SITE, articleSchema, breadcrumbSchema, faqSchema } from '../seo/schema.js';

const MORE_GUIDES = 3;

/** /guias/:slug — one published article, or a 404 for any other address. */
export default function Guide() {
  const { slug } = useParams();
  const promise = findGuide(slug) ? loadGuideArticle(slug) : null;
  // use() suspends until the article's own chunk has loaded: the prerender
  // waits for it, and hydration keeps the prerendered page until it is there.
  const article = promise ? use(promise) : null;
  if (!article) return <NotFound />;
  return <GuideArticle article={article} />;
}

function GuideArticle({ article }) {
  const { lang, t, localize } = useLanguage();
  const navigate = useNavigate();
  const text = article[lang];

  const esPath = `/${GUIDES_SLUG}/${article.slug}`;
  const canonicalUrl = `${SITE}${localize(esPath)}`;
  const sectionUrl = `${SITE}${localize(`/${GUIDES_SLUG}`)}`;
  const updated = guideDate(article.updatedAt ?? article.publishedAt, lang);
  const others = GUIDES.filter((g) => g.slug !== article.slug)
    .sort((a, b) => (b.topic === article.topic) - (a.topic === article.topic))
    .slice(0, MORE_GUIDES);

  // Links inside the text are plain <a> tags; one to a page of the site goes
  // through the router like any other link, instead of reloading the app.
  const followLink = (event) => {
    const anchor = event.target.closest?.('a');
    const href = anchor?.getAttribute('href');
    const plainClick =
      event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    if (!href || !plainClick || anchor.target || !href.startsWith('/') || href.startsWith('//'))
      return;
    if (href.startsWith('/uploads/')) return;
    event.preventDefault();
    navigate(href);
  };

  return (
    <>
      <title>{`${text.title} | Mirage Muebles`}</title>
      <meta name="description" content={text.description} />
      <link rel="canonical" href={canonicalUrl} />
      <HreflangLinks esPath={esPath} />
      <SocialMeta
        title={text.title}
        description={text.description}
        url={canonicalUrl}
        type="article"
        image={resolveImage(article.cover, 1600)}
      />
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: t('nav.home'), url: `${SITE}${localize('/')}` },
            { name: t('guides.title'), url: sectionUrl },
            { name: text.title, url: canonicalUrl },
          ]),
          articleSchema({
            url: canonicalUrl,
            title: text.title,
            description: text.description,
            image: resolveImage(article.cover, 1600),
            publishedAt: article.publishedAt,
            updatedAt: article.updatedAt,
            lang,
          }),
          faqSchema(text.faq),
        ].filter(Boolean)}
      />

      <article>
        <header className="px-6 pt-6 md:px-12 md:pt-10 lg:px-20">
          <nav
            aria-label="breadcrumb"
            className="mb-6 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.08em] text-secondary"
          >
            <Link to={`/${GUIDES_SLUG}`} className="transition-colors hover:text-accent-text">
              {t('guides.title')}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-primary/70">{t(`guides.topic.${article.topic}`)}</span>
          </nav>
          <div className="max-w-3xl">
            <h1 className="font-serif text-[clamp(2.25rem,4.4vw,3.5rem)] font-light leading-[1.08] tracking-tight text-primary">
              {text.title}
            </h1>
            <p className="mt-5 text-xs uppercase tracking-[0.12em] text-secondary">
              {t('guides.author')}
              {updated && (
                <>
                  {' · '}
                  {t('guides.updated')}{' '}
                  <time dateTime={article.updatedAt ?? article.publishedAt}>{updated}</time>
                </>
              )}
            </p>
          </div>
        </header>

        <div className="px-6 pb-20 pt-8 md:px-12 md:pb-28 md:pt-10 lg:px-20">
          <div className="max-w-2xl">
            {/* The answer first: what search engines and AI assistants quote. */}
            <section
              aria-labelledby="guide-answer"
              className="border-l-2 border-accent bg-surface p-6 md:p-8"
            >
              <h2 id="guide-answer" className="text-xs uppercase tracking-[0.2em] text-accent-text">
                {t('guides.answer')}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-primary md:text-lg">
                {text.answer}
              </p>
            </section>

            {article.cover && (
              <figure className="relative mt-10 aspect-[4/3] overflow-hidden bg-surface md:aspect-video">
                <Media id={article.cover} alt={text.coverAlt} w={1600} />
              </figure>
            )}

            {text.toc.length > 1 && (
              <nav aria-labelledby="guide-toc" className="mt-10 border-y border-primary/10 py-6">
                <h2 id="guide-toc" className="text-xs uppercase tracking-[0.2em] text-secondary">
                  {t('guides.toc')}
                </h2>
                <ol className="mt-4 space-y-2 text-sm">
                  {text.toc.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="text-primary/80 transition-colors hover:text-accent-text"
                      >
                        {item.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            <div
              className={GUIDE_PROSE}
              onClick={followLink}
              dangerouslySetInnerHTML={{ __html: text.html }}
            />

            {text.faq.length > 0 && (
              <section aria-labelledby="guide-faq" className="mt-16">
                <h2
                  id="guide-faq"
                  className="font-serif text-[clamp(1.6rem,2.6vw,2.1rem)] font-light leading-tight tracking-tight text-primary"
                >
                  {t('guides.faq')}
                </h2>
                <dl className="mt-6 divide-y divide-primary/10 border-y border-primary/10">
                  {text.faq.map(({ q, a }) => (
                    <div key={q} className="py-5">
                      <dt className="font-medium text-primary">{q}</dt>
                      <dd className="mt-2 text-sm leading-relaxed text-secondary md:text-base">
                        {a}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>
        </div>
      </article>

      <GuideProducts rule={article.products} />

      {others.length > 0 && (
        <section aria-labelledby="guide-more" className="px-6 py-14 md:px-12 md:py-20 lg:px-20">
          <h2
            id="guide-more"
            className="mb-10 font-serif text-[clamp(1.875rem,2.8vw,2.25rem)] font-light tracking-tight text-primary"
          >
            {t('guides.more')}
          </h2>
          <div className="grid grid-cols-1 gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
            {others.map((guide) => (
              <GuideCard key={guide.slug} guide={guide} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
