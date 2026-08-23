/**
 * Share-card description text.
 *
 * Telegram renders line breaks inside og:description, so multi-line copy written
 * in /admin (or in a product description) should reach the preview intact. Other
 * scrapers — WhatsApp, Facebook, X — collapse the breaks themselves, so keeping
 * them costs nothing there.
 *
 * What still gets tidied: runs of spaces and tabs, since catalog and JSX copy is
 * routinely wrapped and indented; blank-line runs, capped at one; and leading or
 * trailing whitespace on every line and on the whole string.
 */
export function shareDescription(text) {
  if (typeof text !== 'string') return undefined;
  const normalized = text
    .replace(/\r\n?/g, '\n') // one line-ending style
    .replace(/[^\S\n]+/g, ' ') // collapse spaces/tabs, leave newlines alone
    .replace(/ *\n */g, '\n') // no padding around a break
    .replace(/\n{3,}/g, '\n\n') // at most one blank line
    .trim();
  return normalized || undefined;
}
