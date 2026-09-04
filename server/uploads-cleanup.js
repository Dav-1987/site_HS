// Which files in uploads/ nothing points at any more.
//
// The scheduled-deletion queue is fed by catalog and settings saves: a file
// that disappears from one gets a row in `pending_deletions` and is removed a
// day later. That misses an upload which never made it into a save at all —
// a photo picked in /admin and then abandoned, or one attached to a product
// that was never saved. Those were invisible to the sweep and stayed forever
// (45 MB of them had piled up since June before this existed).
//
// Kept pure and separate from the filesystem so the rules that decide what is
// safe to delete can be tested exhaustively.

/** A file becomes eligible a day after its last write. */
export const STRAY_GRACE_MS = 24 * 60 * 60 * 1000;

// Uploads are named after their own content: 32 hex characters from a sha256
// of the bytes, plus the original extension (see /api/upload). Everything else
// in the directory is derived from one of those — `<base>_800.webp`,
// `<base>_poster.jpg` — and is removed together with the original it belongs
// to, so only originals are ever considered here.
const ORIGINAL_NAME = /^[0-9a-f]{32}\.[A-Za-z0-9]+$/;

export function isOriginalUpload(name) {
  return ORIGINAL_NAME.test(name);
}

/**
 * Originals safe to schedule for deletion.
 *
 * @param entries    `{ name, mtimeMs }` for every file in uploads/
 * @param activeKeys filenames the catalog and settings currently reference
 * @returns names to hand to scheduleForDeletion (which adds another day of
 *          grace before anything is actually unlinked)
 */
export function findStrayUploads(
  entries,
  activeKeys,
  { now = Date.now(), graceMs = STRAY_GRACE_MS } = {},
) {
  return entries
    .filter(
      (e) =>
        isOriginalUpload(e.name) &&
        !activeKeys.has(e.name) &&
        // An upload still being written, or a product open in /admin and not
        // yet saved, must never be swept out from under whoever is working.
        now - e.mtimeMs >= graceMs,
    )
    .map((e) => e.name);
}
