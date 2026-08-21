import { Link } from './LocalizedLink.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useCatalog } from '../catalog/CatalogContext.jsx';
import { findCategory, isListed, OTHER_MODELS_SLUG } from '../data/catalog.js';

/**
 * Tile that closes every category grid and leads to the "Otros Modelos"
 * section — the section's only entry point anywhere on the site (it is kept out
 * of the catalog grid, the home page and the header menu on purpose; see
 * TILE_ENTRY_SLUGS).
 *
 * Shaped like a product card's photo (same 4:5 box, same grid cell) but carries
 * the section name instead of an image.
 *
 * Being the section's only door, the tile is what its `visibility` switch
 * actually controls: it renders while the section is public, and disappears the
 * moment /admin hides it, so "hidden from listings" leaves no link behind.
 * It also renders nothing if the section has been deleted outright, so the grid
 * never shows a dead link.
 */
export default function OtherModelsCard() {
  const { lang } = useLanguage();
  const { allCategories } = useCatalog();
  const category = findCategory(allCategories, OTHER_MODELS_SLUG);
  if (!category || !isListed(category)) return null;

  const name = category.name[lang] ?? category.name.es;

  return (
    <Link
      to={`/${category.slug}`}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-background"
    >
      <article className="flex aspect-[4/5] flex-col items-center justify-center gap-5 border border-primary/15 bg-surface px-4 text-center transition-colors duration-500 group-hover:border-accent/50">
        <h3 className="font-serif text-xl font-light leading-tight tracking-tight text-primary transition-colors duration-300 group-hover:text-accent-text md:text-2xl">
          {name}
        </h3>
        <span
          aria-hidden="true"
          className="touch-target flex items-center justify-center rounded-full border border-primary/20 text-primary/60 transition-all duration-500 group-hover:border-accent group-hover:text-accent-text"
        >
          →
        </span>
      </article>
    </Link>
  );
}
