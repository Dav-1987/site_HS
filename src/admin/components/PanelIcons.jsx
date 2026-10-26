// The glyphs on a side panel's square header buttons (BTN_PANEL_ICON in
// ../ui.js) — the product's ↑ ↓ to the neighbouring product, the category's
// ↑ ↓ to move it, and both panels' ✕.

export function Chevron({ up }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path
        d={up ? 'm18 15-6-6-6 6' : 'm6 9 6 6 6-6'}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}
