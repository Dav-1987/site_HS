import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import Reveal from './Reveal.jsx';
import ProductCard from './ProductCard.jsx';

/**
 * Carousel scroll/drag state, shared by the default `ProductCarousel` layout
 * and by callers that need to place the arrow controls elsewhere (e.g. the
 * home "Featured" section puts them in the section header instead of below
 * the track) while still driving the same scrollable track.
 */
export function useCarousel() {
  const trackRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const dragRef = useRef({ active: false, startX: 0, scrollLeft: 0, moved: false });

  const syncState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 24;
    const cardW = el.firstElementChild ? el.firstElementChild.offsetWidth + gap : 0;
    setAtStart(el.scrollLeft < 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
    if (cardW > 0) setActiveIdx(Math.round(el.scrollLeft / cardW));
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(syncState);
    ro.observe(el);
    syncState();
    return () => ro.disconnect();
  }, [syncState]);

  const scroll = (dir) => {
    const el = trackRef.current;
    if (!el?.firstElementChild) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 24;
    el.scrollBy({ left: dir * (el.firstElementChild.offsetWidth + gap), behavior: 'smooth' });
  };

  const goTo = (i) => {
    const el = trackRef.current;
    if (!el?.firstElementChild) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 24;
    el.scrollTo({ left: i * (el.firstElementChild.offsetWidth + gap), behavior: 'smooth' });
  };

  return { trackRef, dragRef, activeIdx, atStart, atEnd, syncState, scroll, goTo };
}

/** Horizontal, snap-scrolling, drag-to-scroll track of product cards. */
export function CarouselTrack({ products, carousel }) {
  const { trackRef, dragRef, syncState } = carousel;

  return (
    <Reveal>
      <div
        ref={trackRef}
        onScroll={syncState}
        onMouseDown={(e) => {
          const el = trackRef.current;
          dragRef.current = { active: true, startX: e.pageX, scrollLeft: el.scrollLeft, moved: false };
          el.style.cursor = 'grabbing';
          el.style.scrollSnapType = 'none';
        }}
        onMouseMove={(e) => {
          const d = dragRef.current;
          if (!d.active) return;
          const dx = e.pageX - d.startX;
          if (Math.abs(dx) > 4) d.moved = true;
          trackRef.current.scrollLeft = d.scrollLeft - dx;
        }}
        onMouseUp={() => {
          const el = trackRef.current;
          dragRef.current.active = false;
          el.style.cursor = '';
          el.style.scrollSnapType = '';
          syncState();
        }}
        onMouseLeave={() => {
          if (!dragRef.current.active) return;
          const el = trackRef.current;
          dragRef.current.active = false;
          el.style.cursor = '';
          el.style.scrollSnapType = '';
          syncState();
        }}
        onClick={(e) => {
          if (dragRef.current.moved) e.stopPropagation();
        }}
        className="no-scrollbar flex cursor-grab gap-6 overflow-x-auto snap-x snap-mandatory pb-1 [scroll-padding-inline-start:1.5rem] md:gap-8 md:[scroll-padding-inline-start:3rem] lg:[scroll-padding-inline-start:5rem]"
      >
        <div className="w-6 flex-none md:w-12 lg:w-20" aria-hidden="true" />
        {products.map((p) => (
          <div
            key={p.id}
            className="w-[85%] flex-none snap-start sm:w-[calc(50%-18px)] md:w-[calc(50%-32px)] lg:w-[calc(33.333%-37px)]"
          >
            <ProductCard product={p} categorySlug={p.categorySlug} categoryName={p.category} />
          </div>
        ))}
        <div className="w-6 flex-none md:w-12 lg:w-20" aria-hidden="true" />
      </div>
    </Reveal>
  );
}

/** Prev/next arrow buttons, driven by a `useCarousel()` instance. */
export function CarouselArrows({ carousel }) {
  const { t } = useLanguage();
  const { atStart, atEnd, scroll } = carousel;

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => scroll(-1)}
        disabled={atStart}
        aria-label={t('carousel.prev')}
        className="flex h-10 w-10 items-center justify-center border border-primary/20 text-xl text-primary/60 transition-colors duration-200 hover:border-primary/40 hover:text-primary disabled:opacity-25"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={() => scroll(1)}
        disabled={atEnd}
        aria-label={t('carousel.next')}
        className="flex h-10 w-10 items-center justify-center border border-primary/20 text-xl text-primary/60 transition-colors duration-200 hover:border-primary/40 hover:text-primary disabled:opacity-25"
      >
        ›
      </button>
    </div>
  );
}

/** Progress dots, driven by a `useCarousel()` instance. */
export function CarouselDots({ products, carousel }) {
  const { t } = useLanguage();
  const { activeIdx, goTo } = carousel;

  return (
    <div className="flex items-center gap-2">
      {products.map((_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`${t('carousel.goTo')} ${i + 1}`}
          onClick={() => goTo(i)}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === activeIdx ? 'w-6 bg-accent' : 'w-1.5 bg-primary/25'
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Default carousel layout: track with dots + arrows below it. Shared by the
 * home "Featured" section and the product page "You may also like" block
 * (the surrounding heading is owned by each caller). Products are expected
 * to carry `categorySlug` + `category` (as produced by the catalog
 * `withCategory` helper).
 */
export default function ProductCarousel({ products }) {
  const carousel = useCarousel();
  if (!products?.length) return null;

  return (
    <>
      <CarouselTrack products={products} carousel={carousel} />
      <div className="mt-8 flex items-center px-6 md:px-12 lg:px-20">
        <CarouselDots products={products} carousel={carousel} />
        <div className="ml-auto">
          <CarouselArrows carousel={carousel} />
        </div>
      </div>
    </>
  );
}
