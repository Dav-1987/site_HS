import { useRef } from 'react';
import { Link } from 'react-router-dom';
import Media from './Media.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';

/** Editorial category tile used on the home + catalog pages. */
export default function CategoryCard({ category }) {
  const { lang, t } = useLanguage();
  const videoRef = useRef(null);

  const handleMouseEnter = () => videoRef.current?.play();
  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <Link
      to={`/categoria/${category.slug}`}
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

        <span className="absolute left-5 top-5 text-[11px] uppercase tracking-[0.2em] text-background/75">
          {category.products.length} {t('category.products')}
        </span>

        <span
          aria-hidden="true"
          className="absolute right-5 top-5 flex h-10 w-10 translate-y-1 items-center justify-center rounded-full border border-background/40 text-background opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100"
        >
          →
        </span>

        <div className="absolute inset-x-0 bottom-0 p-6">
          <h3 className="font-serif text-2xl font-light leading-tight text-background md:text-3xl">
            {category.name[lang]}
          </h3>
          <p className="mt-1.5 text-[11px] uppercase tracking-[0.18em] text-background/70">
            {category.tagline[lang]}
          </p>
        </div>
      </article>
    </Link>
  );
}
