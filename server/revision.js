import { createHash } from 'node:crypto';

// Saving the catalog or the settings sends the whole of it, so two admin tabs —
// a laptop left open since the morning and a phone — used to overwrite each
// other's work in silence: the last «Сохранить» won. Now every read hands the
// admin a revision of what it loaded, every save hands it back, and a save whose
// revision no longer matches what is stored is turned away with 409.
//
// The revision is a fingerprint of the stored data as the API returns it, not a
// counter, so it needs no column of its own and never drifts from the data.

/** A short fingerprint of a stored catalog or settings object. */
export function revisionOf(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
}

/**
 * True when a save was based on data that has changed since. A save that names
 * no revision is let through unchecked: scripts, an admin tab opened before
 * this shipped, and the admin's own «Сохранить мои поверх».
 */
export function isStale(baseRevision, currentRevision) {
  return typeof baseRevision === 'string' && baseRevision !== currentRevision;
}

/**
 * Runs async jobs one after another, so the check and the write of one save are
 * never split by another save. Enough for the API's single process (PM2 fork
 * mode, see ecosystem.config.cjs); a failed job does not block the next.
 */
export function createQueue() {
  let tail = Promise.resolve();
  return (job) => {
    const run = tail.then(job, job);
    tail = run.catch(() => {});
    return run;
  };
}
