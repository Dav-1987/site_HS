import { Link } from '../LocalizedLink.jsx';
import Media from '../Media.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { GUIDES_SLUG } from '../../data/guides.js';

/** A guide in a list: cover, title and the description search engines show too. */
export default function GuideCard({ guide, Heading = 'h3' }) {
  const { lang } = useLanguage();
  const { title, description, coverAlt } = guide[lang];

  return (
    <Link
      to={`/${GUIDES_SLUG}/${guide.slug}`}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-background"
    >
      <div className="relative aspect-video overflow-hidden bg-surface">
        <Media
          id={guide.cover}
          alt={coverAlt}
          w={800}
          className="transition-transform duration-700 ease-out group-hover:scale-105"
        />
      </div>
      <Heading className="mt-5 font-serif text-xl font-light leading-snug tracking-tight text-primary transition-colors duration-300 group-hover:text-accent-text md:text-2xl">
        {title}
      </Heading>
      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-secondary">{description}</p>
    </Link>
  );
}
