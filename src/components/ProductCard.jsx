import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Media from './Media.jsx';
import Price from './Price.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { productImages } from '../data/catalog.js';

/** Product tile: swipeable image carousel + discount-aware price. */
export default function ProductCard({ product, categoryName }) {
  const { lang, t } = useLanguage();
  const to = `/producto/${product.id}`;
  const label = categoryName ? `${product.name} — ${categoryName[lang]}` : product.name;

  const images = productImages(product);
  const multi = images.length > 1;
  const [idx, setIdx] = useState(0);
  const startX = useRef(null);
  const swiped = useRef(false);

  const go = (dir) => setIdx((i) => (i + dir + images.length) % images.length);

  return (
    <article className="group">
      <div
        className="relative mb-5 aspect-[4/5] overflow-hidden bg-surface"
        onPointerDown={(e) => {
          startX.current = e.clientX;
          swiped.current = false;
        }}
        onPointerUp={(e) => {
          if (startX.current == null) return;
          const dx = e.clientX - startX.current;
          if (multi && Math.abs(dx) > 40) {
            swiped.current = true;
            go(dx < 0 ? 1 : -1);
          }
          startX.current = null;
        }}
      >
        <Link
          to={to}
          aria-label={label}
          onClick={(e) => {
            // A swipe ends with a click — don't navigate in that case.
            if (swiped.current) {
              e.preventDefault();
              swiped.current = false;
            }
          }}
          className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        >
          <Media
            id={images[idx]}
            idMobile={idx === 0 ? product.imageMobile : ''}
            alt={label}
            w={700}
            className="transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-background/0 opacity-0 transition-all duration-300 group-hover:bg-background/85 group-hover:opacity-100">
            <span className="text-xs uppercase tracking-[0.25em] text-primary">
              {t('product.view')}
            </span>
          </div>
        </Link>

        {multi && (
          <>
            <button
              type="button"
              aria-label={t('carousel.prev')}
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center bg-background/80 text-lg text-primary opacity-0 transition-opacity duration-300 hover:bg-background focus-visible:opacity-100 group-hover:opacity-100"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label={t('carousel.next')}
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center bg-background/80 text-lg text-primary opacity-0 transition-opacity duration-300 hover:bg-background focus-visible:opacity-100 group-hover:opacity-100"
            >
              ›
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {images.map((img, i) => (
                <span
                  key={img + i}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    i === idx ? 'bg-primary' : 'bg-primary/30'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="border-t border-primary/10 pt-4">
        <h3 className="font-serif text-xl text-primary transition-colors duration-300 group-hover:text-accent">
          {product.name}
        </h3>
        {product.description?.[lang] && (
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-primary/55">
            {product.description[lang]}
          </p>
        )}
        <Price product={product} className="mt-2 font-serif text-lg text-primary/80" />
        <div className="mt-1 text-[11px] uppercase tracking-[0.15em] text-secondary">
          {product.material[lang] && <p>{product.material[lang]}</p>}
          {product.size && <p className="mt-0.5 text-primary/40">{product.size}</p>}
        </div>
      </div>
    </article>
  );
}
