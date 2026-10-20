/**
 * The search field at the top of a list section (catalog, orders). Controlled
 * by the section's own state — never read back from the address, see
 * CatalogSection — and named for screen readers by `label`.
 */
export default function SearchBox({ label, value, onChange, placeholder, className = '' }) {
  return (
    <label className={`relative block min-w-0 ${className}`}>
      <span className="sr-only">{label}</span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-secondary"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        // The browser's own clear button is a blue ×; the section offers its
        // own way back from a search.
        className="min-h-12 w-full border border-primary/30 bg-background pl-11 pr-3 text-base text-primary transition-colors placeholder:text-secondary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&::-webkit-search-cancel-button]:hidden"
      />
    </label>
  );
}
