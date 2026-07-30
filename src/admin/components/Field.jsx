import { INPUT, LABEL } from '../ui.js';

export function Field({ label, value, onChange, type = 'text', ...rest }) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      <input
        type={type}
        className={INPUT}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
    </label>
  );
}

/** `options` is a list of `{ value, label }`. */
export function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      <select className={INPUT} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TextArea({ label, value, onChange }) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      <textarea
        rows={2}
        className={`${INPUT} resize-y`}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
