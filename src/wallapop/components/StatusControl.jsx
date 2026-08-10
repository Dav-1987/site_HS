import { LISTING_STATUSES, STATUS_LABELS } from '../listings.js';

const ACTIVE_CLASSES = {
  not_published: 'border-primary bg-primary text-background',
  published: 'border-accent bg-accent text-primary',
  sold: 'border-sale bg-sale text-background',
};

export default function StatusControl({ productId, value, onChange }) {
  return (
    <fieldset>
      <legend className="mb-2 text-[10px] uppercase tracking-[0.18em] text-primary/45">
        Статус объявления
      </legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {LISTING_STATUSES.map((status) => {
          const active = value === status;
          return (
            <button
              key={status}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(productId, { status })}
              className={`border px-3 py-2 text-[10px] uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                active
                  ? ACTIVE_CLASSES[status]
                  : 'border-primary/15 bg-background text-primary/60 hover:border-primary/40 hover:text-primary'
              }`}
            >
              {STATUS_LABELS[status]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
