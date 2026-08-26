import { useEffect, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Link } from '../components/LocalizedLink.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useCatalog } from '../catalog/CatalogContext.jsx';
import {
  isInStock,
  productDescription,
  productDimensions,
  productFullName,
  productMetaDescription,
  productDiscount,
  productImages,
  productLabel,
  productMedia,
  productPerkVariant,
  productReference,
  computeRelated,
  resolveImage,
} from '../data/catalog.js';
import { trackPixel } from '../lib/track.js';
import JsonLd from '../components/JsonLd.jsx';
import SocialMeta from '../components/SocialMeta.jsx';
import HreflangLinks from '../components/HreflangLinks.jsx';
import { productSchema, breadcrumbSchema } from '../seo/schema.js';

const SITE = 'https://hsmuebles.es';
import Media from '../components/Media.jsx';
import ProductBadge, { SOLD_OUT_MEDIA } from '../components/ProductBadge.jsx';
import Reveal from '../components/Reveal.jsx';
import Button from '../components/Button.jsx';
import Price from '../components/Price.jsx';
import Lightbox from '../components/Lightbox.jsx';
import ProductCarousel from '../components/ProductCarousel.jsx';
import OrderModal from '../components/OrderModal.jsx';
import ExpandableText from '../components/ExpandableText.jsx';
import NotFound from './NotFound.jsx';

function IconTruck({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-6 w-6 shrink-0 ${className}`}
    >
      <rect x="1" y="6" width="14" height="11" rx="1" />
      <path d="M15 9h4l3 3v5h-7z" />
      <circle cx="6" cy="19" r="1.75" />
      <circle cx="17.5" cy="19" r="1.75" />
    </svg>
  );
}

function IconTools({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-6 w-6 shrink-0 ${className}`}
    >
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L2.6 18.4a1.5 1.5 0 0 0 2.12 2.12L11.4 13.8a4 4 0 0 0 5.4-5.4l-2.5 2.5-2-2z" />
    </svg>
  );
}

function IconBulb({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-6 w-6 shrink-0 ${className}`}
    >
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M12 3a6 6 0 0 0-4 10.47c.53.5.9 1.16 1 1.88V16h6v-.65c.1-.72.47-1.38 1-1.88A6 6 0 0 0 12 3z" />
    </svg>
  );
}

function IconBulbRays({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-6 w-6 shrink-0 ${className}`}
    >
      <path d="M12 2v2" />
      <path d="M5.6 4.6 7 6" />
      <path d="M18.4 4.6 17 6" />
      <path d="M3 11h2" />
      <path d="M19 11h2" />
      <path d="M12 7a4.5 4.5 0 0 0-2.7 8.1c.45.34.7.87.7 1.43V17h4v-.47c0-.56.25-1.09.7-1.43A4.5 4.5 0 0 0 12 7z" />
      <path d="M10 20h4" />
    </svg>
  );
}

function IconAward({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-6 w-6 shrink-0 ${className}`}
    >
      <circle cx="12" cy="9" r="6" />
      <path d="M8.3 13.9 7 21.5l5-2.9 5 2.9-1.3-7.6" />
    </svg>
  );
}

// Third perk per variant — see PERK_VARIANTS in data/catalog.js. The first two
// (delivery, installation) are the same for every product.
const PERK_ICONS = {
  bulbs: IconBulb,
  led: IconBulbRays,
  quality: IconAward,
};

function OrderPerks({ t, variant }) {
  const perks = [
    { Icon: IconTruck, label: t('order.perk.delivery') },
    { Icon: IconTools, label: t('order.perk.installation') },
    { Icon: PERK_ICONS[variant], label: t(`order.perk.${variant}`) },
  ];
  return (
    <div className="mt-6 grid w-full grid-cols-3 divide-x divide-primary/10 rounded-2xl border border-primary/10 bg-surface sm:w-auto">
      {perks.map(({ Icon, label }) => (
        <div key={label} className="flex flex-col items-center gap-2 px-3 py-5 text-center sm:px-6">
          <Icon className="text-accent-text" />
          <span className="text-xs font-medium uppercase leading-tight tracking-widest text-primary/70">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

function RelatedCarousel({ related, title }) {
  return (
    <section className="mt-4 py-14 md:mt-8 md:py-20">
      <div className="px-6 md:px-12 lg:px-20">
        <h2 className="mb-12 font-serif text-3xl font-light tracking-tight text-primary md:text-4xl">
          {title}
        </h2>
      </div>

      <ProductCarousel products={related} />
    </section>
  );
}

export default function Product() {
  const { categorySlug, id } = useParams();
  const { lang, t, localize } = useLanguage();
  const { getProduct, categories, loaded } = useCatalog();
  const [active, setActive] = useState(0);
  const [thumbStart, setThumbStart] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const startX = useRef(null);
  const suppressZoom = useRef(false);

  // Reset gallery state when navigating between products.
  useEffect(() => {
    setActive(0);
    setThumbStart(0);
  }, [id]);

  // Meta Pixel: fire ViewContent once the catalog is loaded and the product
  // resolves, so retargeting / catalog audiences capture product views.
  useEffect(() => {
    if (!loaded) return;
    const match = getProduct(id);
    if (match) {
      // `value`/`currency` are sent explicitly: left to itself the pixel scrapes
      // the rendered "199 €" off the page, cannot parse the symbol into an ISO
      // code, and drops the value with a console warning.
      const { price } = productDiscount(match.product);
      trackPixel('ViewContent', {
        content_type: 'product',
        content_ids: [match.product.id],
        content_name: productLabel(match.product),
        ...(price > 0 ? { value: price, currency: 'EUR' } : null),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, loaded]);

  const found = getProduct(id);
  if (!found && !loaded) return null;
  if (!found) return <NotFound />;

  const { product, category } = found;
  const soldOut = !isInStock(product);
  const dim = soldOut ? SOLD_OUT_MEDIA : '';

  // Canonical URL: if the category slug in the URL is stale or wrong
  // (renamed category, moved product), redirect to the correct one.
  if (category.slug !== categorySlug) {
    return <Navigate to={localize(`/${category.slug}/${product.id}`)} replace />;
  }

  // Unified, ordered gallery: photos and videos interleaved exactly as the
  // admin arranged them. Each item is { type:'image'|'video', src }.
  const gallery = productMedia(product);
  // Photos only (for the OG image and Schema.org — both photo-only).
  const images = productImages(product);
  // Gallery slot of the first photo — the only one that gets the mobile-cropped
  // cover variant (product.imageMobile).
  const firstPhotoIdx = gallery.findIndex((m) => m.type !== 'video');
  const multi = gallery.length > 1;
  const THUMB_VISIBLE = 4;
  const activeIdx = Math.min(active, gallery.length - 1);
  // Undefined for a product with no photos and no video yet — /admin can create
  // and save one (see addProduct in CategoryEditor). `Media` shows the branded
  // placeholder for an empty id, and the video branch needs a real item, so the
  // page still renders (name, price, specs, order button) instead of throwing.
  const activeItem = gallery[activeIdx];
  const isVideoActive = activeItem?.type === 'video';

  const activateImage = (i) => {
    setActive(i);
    setThumbStart((s) => {
      if (i < s) return i;
      if (i >= s + THUMB_VISIBLE)
        return Math.min(i - THUMB_VISIBLE + 1, gallery.length - THUMB_VISIBLE);
      return s;
    });
  };
  const goImage = (dir) => activateImage((activeIdx + dir + gallery.length) % gallery.length);
  const shiftStrip = (dir) =>
    setThumbStart((s) => Math.max(0, Math.min(s + dir, gallery.length - THUMB_VISIBLE)));

  const related = computeRelated(categories, product, category, product.related);
  // The snippet, not the whole text: Google shows about 155 characters and the
  // rest is cut mid-word. See productMetaDescription — it also keeps the gift
  // line, always last, out of the search result without a filter.
  const metaDesc = productMetaDescription(product, category, lang);
  const esPath = `/${category.slug}/${product.id}`;
  const canonicalUrl = `${SITE}${localize(esPath)}`;
  const categoryUrl = `${SITE}${localize(`/${category.slug}`)}`;
  const catalogUrl = `${SITE}${localize('/catalogo')}`;
  // Many products share the same generic `name` (e.g. "Tocador") and even the
  // same `subtitle` (dimensions) within a category — fold in the reference
  // (always present, always unique) so every page gets a distinct <title>.
  // Without it 50 of the 124 pages would collide, which reads to Google as one
  // page duplicated rather than as separate products.
  const ref = (product.reference || productReference(product.name) || '').trim();
  // Collapsed: 19 names carry a trailing space in the catalog ("Espejo "), and
  // a doubled space is visible in a search result.
  const fullName = productFullName(product);
  const pageTitle = [fullName, product.subtitle, ref && `(${ref})`]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  const ogImage = resolveImage(images[0], 1600);
  // Dimensions belong in the spec list rather than inside the description: they
  // are the same question for every product, they were being retyped by hand
  // into prose that then had to agree with the `size` field, and a description
  // long enough to collapse would have hidden them behind "read more".
  const dimensions = productDimensions(product);
  const specs = [
    { label: t('product.collectionLabel'), value: category.name[lang] },
    ...(dimensions
      ? [
          {
            label: t('product.sizeLabel'),
            value: dimensions.map((d) => `• ${t(`product.dim.${d.key}`)} ${d.value}`).join(' '),
          },
        ]
      : []),
    {
      label: t('product.skuLabel'),
      value: product.reference?.trim() || productReference(product.name),
    },
  ];

  return (
    <>
      {/* The category name is deliberately absent. Google shows about 60
          characters and "Otros Modelos" — the bucket 68 of 124 products sit in
          — spent 15 of them on a word that means nothing to a searcher and
          distinguishes nothing. The breadcrumb schema still tells Google where
          the product sits. */}
      <title>{`${pageTitle} | Mirage Muebles`}</title>
      <meta name="description" content={metaDesc} />
      <link rel="canonical" href={canonicalUrl} />
      <HreflangLinks esPath={esPath} />
      <SocialMeta
        title={`${pageTitle} | Mirage Muebles`}
        description={metaDesc}
        url={canonicalUrl}
        type="product"
        image={ogImage}
        product={product}
      />
      <JsonLd
        data={[
          productSchema(product, category, lang),
          breadcrumbSchema([
            { name: t('nav.home'), url: `${SITE}${localize('/')}` },
            { name: t('nav.catalog'), url: catalogUrl },
            { name: category.name[lang], url: categoryUrl },
            { name: product.name, url: canonicalUrl },
          ]),
        ]}
      />
      <article className="px-6 pt-4 md:px-12 md:pt-6 lg:px-20">
        {/* Breadcrumb */}
        <nav
          aria-label="breadcrumb"
          className="mb-6 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.08em] text-primary/60"
        >
          <Link to="/catalogo" className="transition-colors hover:text-accent-text">
            {t('nav.catalog')}
          </Link>
          <span aria-hidden="true">/</span>
          <Link to={`/${category.slug}`} className="transition-colors hover:text-accent-text">
            {category.name[lang]}
          </Link>
        </nav>

        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          {/* Mobile-only title above gallery (real <h1>; the category link is a
              visual duplicate of the breadcrumb, so it's hidden from AT). */}
          <div className="lg:hidden">
            <Link
              to={`/${category.slug}`}
              aria-hidden="true"
              tabIndex={-1}
              className="text-xs uppercase tracking-[0.25em] text-accent-text"
            >
              {category.name[lang]}
            </Link>
            <h1 className="mt-2 font-serif leading-[1.05] tracking-tight text-primary">
              <span
                className={`font-light ${
                  fullName.length > 28
                    ? 'text-[clamp(1.5rem,5.5vw,2rem)]'
                    : 'text-[clamp(2.25rem,8vw,3rem)]'
                }`}
              >
                {fullName}
              </span>
              {product.subtitle && (
                <span className="ml-2 text-base font-light text-primary/50">
                  {product.subtitle}
                </span>
              )}
            </h1>
          </div>

          {/* Gallery */}
          <Reveal className="lg:col-span-5">
            <div
              className="group relative aspect-[4/5] overflow-hidden bg-surface [container-type:inline-size]"
              onTouchStart={(e) => {
                startX.current = e.touches[0].clientX;
                suppressZoom.current = false;
              }}
              onTouchEnd={(e) => {
                if (startX.current == null) return;
                const dx = e.changedTouches[0].clientX - startX.current;
                if (multi && Math.abs(dx) > 40) {
                  suppressZoom.current = true;
                  goImage(dx < 0 ? 1 : -1);
                }
                startX.current = null;
              }}
            >
              {isVideoActive ? (
                <video
                  key={activeItem.src}
                  src={activeItem.src}
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  className={`h-full w-full bg-black object-contain ${dim}`}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <button
                  type="button"
                  aria-label={`${t('product.zoom')}: ${product.name}`}
                  onClick={() => {
                    if (suppressZoom.current) {
                      suppressZoom.current = false;
                      return;
                    }
                    setZoom(true);
                  }}
                  className={`absolute inset-0 h-full w-full cursor-zoom-in text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${dim}`}
                >
                  <Media
                    id={activeItem?.src}
                    idMobile={activeIdx === firstPhotoIdx ? product.imageMobile : ''}
                    alt={`${product.name} — ${category.name[lang]}`}
                    w={1400}
                  />
                </button>
              )}
              <ProductBadge product={product} />
              {!isVideoActive && (
                <span className="pointer-events-none absolute bottom-3 right-3 bg-background/85 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  {t('product.zoom')}
                </span>
              )}
              {multi && (
                <>
                  <button
                    type="button"
                    aria-label={t('carousel.prev')}
                    onClick={(e) => {
                      e.stopPropagation();
                      goImage(-1);
                    }}
                    className="touch-target absolute left-1 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center bg-background/80 text-xl text-primary transition-opacity duration-300 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:opacity-0 md:group-hover:opacity-100"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label={t('carousel.next')}
                    onClick={(e) => {
                      e.stopPropagation();
                      goImage(1);
                    }}
                    className="touch-target absolute right-1 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center bg-background/80 text-xl text-primary transition-opacity duration-300 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:opacity-0 md:group-hover:opacity-100"
                  >
                    ›
                  </button>
                </>
              )}
            </div>
            {multi && (
              <div className="relative mt-4">
                {thumbStart > 0 && (
                  <button
                    type="button"
                    aria-label={t('carousel.prev')}
                    onClick={() => shiftStrip(-1)}
                    className="touch-target absolute left-0 top-0 z-10 flex h-full items-center justify-center bg-gradient-to-r from-background via-background/80 to-transparent text-xl text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    ‹
                  </button>
                )}
                <div
                  className="grid grid-cols-4 gap-3 md:gap-4"
                  onTouchStart={(e) => {
                    startX.current = e.touches[0].clientX;
                  }}
                  onTouchEnd={(e) => {
                    if (startX.current == null) return;
                    const dx = e.changedTouches[0].clientX - startX.current;
                    if (Math.abs(dx) > 30) shiftStrip(dx < 0 ? 1 : -1);
                    startX.current = null;
                  }}
                >
                  {gallery.slice(thumbStart, thumbStart + THUMB_VISIBLE).map((item, j) => {
                    const i = thumbStart + j;
                    const isVid = item.type === 'video';
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => activateImage(i)}
                        aria-label={isVid ? t('product.video') : `${t('product.gallery')} ${i + 1}`}
                        aria-current={i === activeIdx}
                        // Filter only: the strip already runs its own opacity
                        // (dimmed until active), so SOLD_OUT_MEDIA's opacity
                        // would fight it — but leaving the thumbs in colour
                        // under a greyed-out main photo reads as a glitch.
                        className={`relative aspect-[4/5] overflow-hidden bg-surface transition-opacity duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                          soldOut ? 'grayscale' : ''
                        } ${i === activeIdx ? 'ring-1 ring-accent' : 'opacity-60 hover:opacity-100'}`}
                      >
                        {isVid ? (
                          <div className="flex h-full w-full items-center justify-center bg-surface">
                            <span className="text-3xl text-primary/30">▶</span>
                          </div>
                        ) : (
                          <Media
                            id={item.src}
                            alt={`${product.name} ${t('product.gallery')} ${i + 1}`}
                            w={300}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
                {thumbStart + THUMB_VISIBLE < gallery.length && (
                  <button
                    type="button"
                    aria-label={t('carousel.next')}
                    onClick={() => shiftStrip(1)}
                    className="touch-target absolute right-0 top-0 z-10 flex h-full items-center justify-center bg-gradient-to-l from-background via-background/80 to-transparent text-xl text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    ›
                  </button>
                )}
              </div>
            )}
          </Reveal>

          {/* Info */}
          <Reveal delay={0.1} className="lg:col-span-7 lg:pl-4">
            <Link
              to={`/${category.slug}`}
              className="hidden text-xs uppercase tracking-[0.25em] text-accent-text transition-colors hover:text-primary lg:inline-block"
            >
              {category.name[lang]}
            </Link>
            <h1 className="hidden font-serif leading-[1.05] tracking-tight text-primary lg:mt-4 lg:block">
              <span
                className={`font-light ${
                  fullName.length > 28
                    ? 'text-[clamp(1.75rem,2.6vw,2.25rem)]'
                    : 'text-[clamp(3rem,4.7vw,3.75rem)]'
                }`}
              >
                {fullName}
              </span>
              {product.subtitle && (
                <span className="ml-3 text-lg font-light text-primary/50">{product.subtitle}</span>
              )}
            </h1>
            <div className="mt-4 lg:mt-4">
              <Price product={product} className="font-serif text-3xl text-primary" />
            </div>

            <ExpandableText
              className="mt-8 max-w-md"
              text={productDescription(product, category, lang)}
            />

            {/* Specs */}
            <dl className="mt-10 border-t border-primary/10">
              {specs.map((s) => (
                <div
                  key={s.label}
                  className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-primary/10 py-4"
                >
                  <dt className="text-xs uppercase tracking-[0.2em] text-secondary">{s.label}</dt>
                  <dd className="text-sm text-primary">{s.value}</dd>
                </div>
              ))}
            </dl>

            {/* CTA */}
            <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-6">
              <Button
                type="button"
                variant="solid"
                disabled={soldOut}
                onClick={() => setOrderOpen(true)}
                className="w-full sm:w-auto"
              >
                {soldOut ? t('product.soldOut') : t('order.button')}
              </Button>
            </div>
            <OrderPerks t={t} variant={productPerkVariant(product)} />
          </Reveal>
        </div>
      </article>

      <OrderModal product={product} isOpen={orderOpen} onClose={() => setOrderOpen(false)} />

      {zoom && (
        <Lightbox
          items={gallery}
          index={activeIdx}
          alt={`${product.name} — ${category.name[lang]}`}
          onClose={() => setZoom(false)}
          onIndex={setActive}
        />
      )}

      {/* Related */}
      {related.length > 0 && <RelatedCarousel related={related} title={t('product.related')} />}
    </>
  );
}
