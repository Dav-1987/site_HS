import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useCatalog } from '../catalog/CatalogContext.jsx';
import { productDescription, productImages, productReference, computeRelated } from '../data/catalog.js';
import Media from '../components/Media.jsx';
import Reveal from '../components/Reveal.jsx';
import Button from '../components/Button.jsx';
import Price from '../components/Price.jsx';
import Lightbox from '../components/Lightbox.jsx';
import ProductCarousel from '../components/ProductCarousel.jsx';
import OrderModal from '../components/OrderModal.jsx';
import NotFound from './NotFound.jsx';

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
  const { lang, t } = useLanguage();
  const { getProduct, categories, loaded } = useCatalog();
  const [active, setActive] = useState(0);
  const [thumbStart, setThumbStart] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const startX = useRef(null);

  // Reset gallery state when navigating between products.
  useEffect(() => {
    setActive(0);
    setThumbStart(0);
  }, [id]);

  const found = getProduct(id);
  if (!found && !loaded) return null;
  if (!found) return <NotFound />;

  const { product, category } = found;

  // Canonical URL: if the category slug in the URL is stale or wrong
  // (renamed category, moved product), redirect to the correct one.
  if (category.slug !== categorySlug) {
    return <Navigate to={`/${category.slug}/${product.id}`} replace />;
  }

  // Real per-product gallery (falls back to the single cover image).
  const images = productImages(product);
  const videoSrc = product.video || '';
  // Full gallery: photos, with the video last (if any).
  // The video slot is an object { type:'video', src }; everything else is a string.
  const gallery = videoSrc ? [...images, { type: 'video', src: videoSrc }] : images;
  const multi = gallery.length > 1;
  const THUMB_VISIBLE = 4;
  const activeIdx = Math.min(active, gallery.length - 1);
  const activeItem = gallery[activeIdx];
  const isVideoActive = typeof activeItem === 'object' && activeItem?.type === 'video';

  const activateImage = (i) => {
    setActive(i);
    setThumbStart((s) => {
      if (i < s) return i;
      if (i >= s + THUMB_VISIBLE) return Math.min(i - THUMB_VISIBLE + 1, gallery.length - THUMB_VISIBLE);
      return s;
    });
  };
  const goImage = (dir) => activateImage((activeIdx + dir + gallery.length) % gallery.length);
  const shiftStrip = (dir) =>
    setThumbStart((s) => Math.max(0, Math.min(s + dir, gallery.length - THUMB_VISIBLE)));

  const related = computeRelated(categories, product, category, product.related);
  const specs = [
    { label: t('product.collectionLabel'), value: category.name[lang] },
    { label: t('product.skuLabel'), value: product.reference?.trim() || productReference(product.name) },
  ];

  return (
    <>
      <article className="px-6 pt-4 md:px-12 md:pt-6 lg:px-20">
        {/* Breadcrumb */}
        <nav
          aria-label="breadcrumb"
          className="mb-6 flex flex-wrap items-center gap-2 text-[9px] md:text-[11px] uppercase tracking-[0.08em] text-primary/40"
        >
          <Link to="/catalogo" className="transition-colors hover:text-accent">
            {t('nav.catalog')}
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            to={`/${category.slug}`}
            className="transition-colors hover:text-accent"
          >
            {category.name[lang]}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-primary/70">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          {/* Mobile-only title above gallery */}
          <div className="lg:hidden" aria-hidden="true">
            <Link
              to={`/${category.slug}`}
              className="text-xs uppercase tracking-[0.25em] text-accent"
            >
              {category.name[lang]}
            </Link>
            <h2 className="mt-2 font-serif leading-[1.05] tracking-tight text-primary">
              <span className="text-[clamp(2.25rem,8vw,3rem)] font-light">{product.name}</span>
              {product.subtitle && (
                <span className="ml-2 text-base font-light text-primary/50">{product.subtitle}</span>
              )}
            </h2>
          </div>

          {/* Gallery */}
          <Reveal className="lg:col-span-5">
            <div
              className={`group relative aspect-[4/5] overflow-hidden bg-surface ${!isVideoActive ? 'cursor-zoom-in' : ''}`}
              onClick={!isVideoActive ? () => setZoom(true) : undefined}
              onTouchStart={(e) => {
                startX.current = e.touches[0].clientX;
              }}
              onTouchEnd={(e) => {
                if (startX.current == null) return;
                const dx = e.changedTouches[0].clientX - startX.current;
                if (multi && Math.abs(dx) > 40) goImage(dx < 0 ? 1 : -1);
                startX.current = null;
              }}
            >
              {isVideoActive ? (
                <video
                  src={activeItem.src}
                  controls
                  playsInline
                  className="h-full w-full object-cover"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <Media
                  id={activeItem}
                  idMobile={activeIdx === 0 ? product.imageMobile : ''}
                  alt={`${product.name} — ${category.name[lang]}`}
                  w={1400}
                />
              )}
              {!isVideoActive && (
                <span className="pointer-events-none absolute bottom-3 right-3 bg-background/85 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  {t('product.zoom')}
                </span>
              )}
              {multi && (
                <>
                  <button
                    type="button"
                    aria-label={t('carousel.prev')}
                    onClick={(e) => { e.stopPropagation(); goImage(-1); }}
                    className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center bg-background/80 text-xl text-primary transition-opacity duration-300 hover:bg-background md:opacity-0 md:group-hover:opacity-100"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label={t('carousel.next')}
                    onClick={(e) => { e.stopPropagation(); goImage(1); }}
                    className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center bg-background/80 text-xl text-primary transition-opacity duration-300 hover:bg-background md:opacity-0 md:group-hover:opacity-100"
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
                    className="absolute left-0 top-0 z-10 flex h-full w-8 items-center justify-center bg-gradient-to-r from-background via-background/80 to-transparent text-xl text-primary"
                  >
                    ‹
                  </button>
                )}
                <div
                  className="grid grid-cols-4 gap-3 md:gap-4"
                  onTouchStart={(e) => { startX.current = e.touches[0].clientX; }}
                  onTouchEnd={(e) => {
                    if (startX.current == null) return;
                    const dx = e.changedTouches[0].clientX - startX.current;
                    if (Math.abs(dx) > 30) shiftStrip(dx < 0 ? 1 : -1);
                    startX.current = null;
                  }}
                >
                  {gallery.slice(thumbStart, thumbStart + THUMB_VISIBLE).map((item, j) => {
                    const i = thumbStart + j;
                    const isVid = typeof item === 'object' && item.type === 'video';
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => activateImage(i)}
                        aria-label={isVid ? t('product.video') : `${t('product.gallery')} ${i + 1}`}
                        aria-current={i === activeIdx}
                        className={`relative aspect-[4/5] overflow-hidden bg-surface transition-opacity duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                          i === activeIdx ? 'ring-1 ring-accent' : 'opacity-60 hover:opacity-100'
                        }`}
                      >
                        {isVid ? (
                          <div className="flex h-full w-full items-center justify-center bg-surface">
                            <span className="text-3xl text-primary/30">▶</span>
                          </div>
                        ) : (
                          <Media id={item} alt={`${product.name} ${t('product.gallery')} ${i + 1}`} w={300} />
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
                    className="absolute right-0 top-0 z-10 flex h-full w-8 items-center justify-center bg-gradient-to-l from-background via-background/80 to-transparent text-xl text-primary"
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
              className="hidden text-xs uppercase tracking-[0.25em] text-accent transition-colors hover:text-primary lg:inline-block"
            >
              {category.name[lang]}
            </Link>
            <h1 className="hidden font-serif leading-[1.05] tracking-tight text-primary lg:mt-4 lg:block">
              <span className="text-[clamp(3rem,4.7vw,3.75rem)] font-light">{product.name}</span>
              {product.subtitle && (
                <span className="ml-3 text-lg font-light text-primary/50">{product.subtitle}</span>
              )}
            </h1>
            <div className="mt-4 lg:mt-4">
              <Price product={product} className="font-serif text-3xl text-primary" />
            </div>

            <p className="mt-8 max-w-md whitespace-pre-line leading-relaxed text-secondary">
              {productDescription(product, category, lang)}
            </p>

            {/* Specs */}
            <dl className="mt-10 border-t border-primary/10">
              {specs.map((s) => (
                <div
                  key={s.label}
                  className="flex items-center justify-between border-b border-primary/10 py-4"
                >
                  <dt className="text-xs uppercase tracking-[0.2em] text-primary/40">{s.label}</dt>
                  <dd className="text-sm text-primary">{s.value}</dd>
                </div>
              ))}
            </dl>

            {/* CTA */}
            <div className="group mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-6">
              <Button
                type="button"
                variant="solid"
                onClick={() => setOrderOpen(true)}
                className="w-full sm:w-auto"
              >
                {t('order.button')}
              </Button>
              <span className="text-sm font-medium text-primary transition-all duration-300 group-hover:text-[1rem] group-hover:font-bold">
                {t('order.shipping')}
              </span>
            </div>

          </Reveal>
        </div>
      </article>

      <OrderModal product={product} isOpen={orderOpen} onClose={() => setOrderOpen(false)} />

      {zoom && !isVideoActive && (
        <Lightbox
          images={images}
          index={Math.min(activeIdx, images.length - 1)}
          alt={`${product.name} — ${category.name[lang]}`}
          onClose={() => setZoom(false)}
          onIndex={setActive}
        />
      )}

      {/* Related */}
      {related.length > 0 && (
        <RelatedCarousel related={related} title={t('product.related')} />
      )}
    </>
  );
}
