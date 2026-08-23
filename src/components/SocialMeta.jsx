import { useEffect } from 'react';
import { useSettings } from '../settings/SettingsContext.jsx';
import { resolveImage } from '../data/catalog.js';
import { SITE, absUrl } from '../seo/schema.js';
import { shareDescription } from '../seo/description.js';

// Last-resort fallback when neither the page nor the admin set a preview image.
const FALLBACK_IMAGE = `${SITE}/logo-mirage.png`;

/**
 * Open Graph + Twitter Card tags, emitted consistently for every page.
 * - `image` is made absolute (social scrapers reject relative URLs).
 * - When a page passes no image, the admin-set default (settings.seo.image)
 *   is used, then the logo as a last resort.
 * - `description` is tidied by shareDescription, which keeps deliberate line
 *   breaks (Telegram renders them) but collapses stray spacing.
 * React 19 hoists these <meta> tags into <head>; the prerenderer keeps them
 * there too, so link previews work without running JS.
 */
export default function SocialMeta({ title, description, url, type = 'website', image }) {
  const { settings } = useSettings();
  useEffect(() => {
    // Signals that the lazy page containing the complete SEO head has committed.
    // ClientReady uses this boundary to reconcile prerendered and React-owned
    // head nodes without ever exposing an empty metadata window.
    document.documentElement.dataset.reactHeadReady = window.location.pathname;
    window.dispatchEvent(new Event('react-head-ready'));
  }, [url]);

  const seoFallback = settings?.seo?.image ? resolveImage(settings.seo.image, 1600) : null;
  const img = absUrl(image) || absUrl(seoFallback) || FALLBACK_IMAGE;
  const desc = shareDescription(description);
  return (
    <>
      <meta property="og:site_name" content="Mirage Muebles" />
      <meta property="og:title" content={title} />
      {desc && <meta property="og:description" content={desc} />}
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={img} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      {desc && <meta name="twitter:description" content={desc} />}
      <meta name="twitter:image" content={img} />
    </>
  );
}
