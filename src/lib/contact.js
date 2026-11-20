// Keep the visible profile handle in sync with the URL set in the admin.
export function handleFromUrl(url) {
  try {
    const segment = new URL(url).pathname.split('/').filter(Boolean)[0] || '';
    return segment ? (segment.startsWith('@') ? segment : `@${segment}`) : url;
  } catch {
    return url;
  }
}
