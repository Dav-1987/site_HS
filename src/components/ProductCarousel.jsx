import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import Reveal from './Reveal.jsx';
import ProductCard from './ProductCard.jsx';

/**
 * Horizontal, snap-scrolling row of product cards with drag-to-scroll,
 * progress dots and prev/next arrows. Shared by the home "Featured" section
 * and the product page "You may also like" block (the surrounding heading is
 * owned by each caller). Products are expected to carry `categorySlug` +
 * `category` (as produced by the catalog `withCategory` helper).
 */
export default function ProductCarousel({ products }) {
  const { t } = useLanguage();
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

  if (!products?.length) return null;

  return (
    <>
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
          className="no-scrollbar flex cursor-grab gap-6 overflow-x-auto snap-x snap-mandatory px-6 pb-1 md:gap-8 md:px-12 lg:px-20"
        >
          {products.map((p) => (
            <div
              key={p.id}
              className="w-[75vw] flex-none snap-start sm:w-[calc(50vw-36px)] md:w-[calc(50vw-64px)] lg:w-[calc(33.333vw-75px)]"
            >
              <ProductCard product={p} categorySlug={p.categorySlug} categoryName={p.category} />
            </div>
          ))}
        </div>
      </Reveal>

      <div className="mt-8 flex items-center px-6 md:px-12 lg:px-20">
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
        <div className="ml-auto flex gap-2">
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
      </div>
    </>
  );
}
