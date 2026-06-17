import { useRef, useState } from 'react';
import { resolveImage } from '../data/catalog.js';

const FILL = 'h-full w-full object-cover';

function uploadSrcSet(path) {
  if (!path || !path.startsWith('/uploads/')) return null;
  const base = path.replace(/\.[^.]+$/, '');
  return `${base}_400.webp 400w, ${base}_800.webp 800w, ${base}_1600.webp 1600w`;
}

/**
 * Image that fills its (aspect-ratio'd, overflow-hidden) parent and degrades
 * to a branded placeholder if the source ever fails to load.
 *
 * While loading, a subtle shimmer sits behind the image and the image fades in
 * on load — this smooths the swap when the catalog hydrates from the API and a
 * cover/gallery URL changes (the shimmer resets whenever `src` changes).
 *
 * `eager` images (the LCP hero) skip the fade so they paint immediately.
 *
 * When `idMobile` is provided a `<picture>` element is rendered with an extra
 * `<source>` that swaps in the mobile image on screens narrower than 768 px.
 */
export default function Media({ id, idMobile = '', alt = '', w = 900, className = '', eager = false }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const prevSrc = useRef(null);

  if (failed || !id) {
    return (
      <div
        className={`${FILL} flex items-center justify-center bg-surface ${className}`}
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
      >
        <span className="font-serif text-3xl font-light text-primary/25">HS</span>
      </div>
    );
  }

  const src = resolveImage(id, w);
  // Reset the loading state when the source actually changes (e.g. on hydration)
  // so the new image fades in instead of popping. Conditional setState during
  // render is the supported pattern for adjusting state to a changed prop.
  if (prevSrc.current !== src) {
    prevSrc.current = src;
    if (!eager && loaded) setLoaded(false);
  }

  // Eager (LCP hero): responsive srcset so the browser picks the right size.
  // Mobile source targets ≤767px — _800.webp covers 2× phones (390×2=780px).
  const eagerSrcSet = eager ? uploadSrcSet(id) : null;
  const mobileSrc = idMobile ? resolveImage(idMobile, eager ? 800 : w) : null;
  const mobileSrcSet = eager ? uploadSrcSet(idMobile) : null;

  // Catches the case where a (cached) image finishes loading before React
  // attaches onLoad — without this the fade could stay stuck at opacity-0.
  const refCb = (node) => {
    if (node && node.complete && node.naturalWidth > 0) setLoaded(true);
  };

  const img = (
    <img
      ref={eager ? undefined : refCb}
      src={src}
      srcSet={eagerSrcSet || undefined}
      sizes={eagerSrcSet ? '100vw' : undefined}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : undefined}
      decoding="async"
      onLoad={eager ? undefined : () => setLoaded(true)}
      onError={() => setFailed(true)}
      className={`${FILL} ${className} ${
        eager ? '' : `transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`
      }`}
    />
  );

  const media = mobileSrc ? (
    <picture className="block h-full w-full">
      <source
        media="(max-width: 767px)"
        srcSet={mobileSrcSet || mobileSrc}
        sizes={mobileSrcSet ? '100vw' : undefined}
      />
      {img}
    </picture>
  ) : (
    img
  );

  // LCP-critical: render directly with no placeholder/fade.
  if (eager) return media;

  return (
    <span className="relative block h-full w-full">
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-surface shimmer transition-opacity duration-500 ${
          loaded ? 'opacity-0' : 'animate-shimmer opacity-100 motion-reduce:animate-none'
        }`}
      />
      {media}
    </span>
  );
}
