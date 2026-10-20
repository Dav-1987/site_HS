/**
 * What a section shows until the data it edits has loaded — or why it did not,
 * with a way to try again. Reloading is safe: unsaved edits are kept as a
 * draft in the browser and offered back (see useCatalogEditor.js).
 */
export default function SectionPending({ error }) {
  if (error) {
    return (
      <div role="alert" className="space-y-3 text-sm">
        <p className="text-danger">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex min-h-11 items-center border border-primary/30 px-4 text-sm font-medium hover:border-primary sm:min-h-9"
        >
          Обновить страницу
        </button>
      </div>
    );
  }
  return (
    <p role="status" className="text-sm text-primary/75">
      Загрузка…
    </p>
  );
}
