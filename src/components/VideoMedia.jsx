/**
 * Video that fills its (aspect-ratio'd, overflow-hidden) parent.
 *
 * autoPlay=true  → muted background loop (hero, category card)
 * controls=true  → full player with sound (product gallery)
 */
export default function VideoMedia({ src, poster, autoPlay = false, controls = false, className = '' }) {
  if (!src) return null;
  return (
    <video
      src={src}
      poster={poster}
      autoPlay={autoPlay}
      muted={autoPlay}
      loop={autoPlay}
      playsInline
      preload={autoPlay ? 'metadata' : 'none'}
      controls={controls && !autoPlay}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}
