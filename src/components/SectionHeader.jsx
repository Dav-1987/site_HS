/** Shared section heading: eyebrow label + large serif title + optional action. */
export default function SectionHeader({ eyebrow, title, action, className = '', gapClassName = 'mb-14 md:mb-20' }) {
  return (
    <div
      className={`${gapClassName} flex flex-col gap-6 md:flex-row md:items-end md:justify-between ${className}`}
    >
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-accent">{eyebrow}</p>
        )}
        <h2 className="font-serif text-[clamp(2.25rem,4.7vw,3.75rem)] font-light leading-[1.05] tracking-tight text-primary">
          {title}
        </h2>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
