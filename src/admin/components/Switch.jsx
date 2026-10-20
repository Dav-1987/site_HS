/**
 * An on/off switch with its label. A real checkbox underneath (role="switch"),
 * so it is reached with Tab, flipped with Space and announced as a switch.
 * The off track is drawn in the full secondary tone, not a faint one: a
 * control's outline needs 3:1 against the page to be seen at all.
 */
export default function Switch({ checked, onChange, children, className = '' }) {
  return (
    <label className={`inline-flex cursor-pointer items-center gap-2 text-sm ${className}`}>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`relative h-5 w-9 shrink-0 rounded-full border-[1.5px] transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 ${
          checked ? 'border-primary bg-primary' : 'border-secondary bg-transparent'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-3 w-3 rounded-full transition-transform ${
            checked ? 'translate-x-4 bg-background' : 'bg-secondary'
          }`}
        />
      </span>
      {children}
    </label>
  );
}
