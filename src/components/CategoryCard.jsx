import { useRef } from 'react';
import { Link } from './LocalizedLink.jsx';
import Media from './Media.jsx';
import { IconGift } from './Gift.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useOptionalCatalog } from '../catalog/CatalogContext.jsx';
import { categoryHasGift } from '../data/catalog.js';

/** Editorial category tile used on the home + catalog pages. */
export default function CategoryCard({ category }) {
  const { lang, t } = useLanguage();
  const videoRef = useRef(null);
  // The same question the navigation menu asks, through the same function, so
  // a collection cannot be marked in one place and not the other. Derived from
  // the offers rather than a switch of its own: setting a gift in /admin is
  // what puts the marker on every tile of that collection, and withdrawing it
  // takes the marker with it.
  //
  // The catalog context is optional here for the reason it is in
  // useProductGift: this tile is rendered on the home page, the catalog and the
  // foot of every category page, and a marker is not worth taking any of them
  // down over.
  const allCategories = useOptionalCatalog()?.allCategories ?? [];
  const hasGift = categoryHasGift(allCategories, category);

  const handleMouseEnter = () => videoRef.current?.play();
  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <Link
      to={`/${category.slug}`}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-background"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <article className="relative aspect-[4/5] overflow-hidden bg-surface">
        <Media
          id={category.image}
          idMobile={category.imageMobile}
          alt={category.name[lang]}
          w={800}
          className="transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
        {category.video && (
          <video
            ref={videoRef}
            src={category.video}
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/65 via-primary/10 to-transparent" />

        <span
          aria-hidden="true"
          className="absolute right-3 top-3 flex h-8 w-8 translate-y-1 items-center justify-center rounded-full border border-background/40 text-background opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 md:right-5 md:top-5 md:h-10 md:w-10"
        >
          →
        </span>

        <div className="absolute inset-x-0 bottom-0 p-3 md:p-6">
          <h3 className="font-serif text-base font-light leading-tight text-background md:text-2xl lg:text-3xl">
            {category.name[lang]}
          </h3>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-background/80 md:mt-1.5">
            {category.products.length} {t('category.products')}
          </p>
          {/* The menu sets this marker in promo red on the panel's own pale
              background. Here it sits on a photo, so it takes the treatment
              every gift marker on a photo takes (see GiftBadge on a product
              tile): the red on a pale plate of its own, rather than red text
              straight onto a picture it cannot be read against. Same words,
              same colour, legible in the place it actually is. */}
          {hasGift && (
            <p className="mt-2">
              <span className="inline-flex items-center gap-1 rounded-[0.3em] bg-background/95 px-2 py-1 text-[0.7rem] font-medium leading-none text-promo">
                <IconGift className="h-3.5 w-3.5 shrink-0" />
                {t('nav.giftBadge')}
              </span>
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}
