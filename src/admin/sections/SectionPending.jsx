/** What a section shows until the data it edits has loaded (or failed to). */
export default function SectionPending({ error }) {
  if (error) {
    return (
      <p role="alert" className="text-sm text-danger">
        {error}
      </p>
    );
  }
  return <p className="text-sm text-primary/75">Загрузка…</p>;
}
