import { Field } from './Field.jsx';
import Collapsible from './Collapsible.jsx';

// Each channel shows as an icon in the footer; an empty field hides its icon.
const CHANNELS = [
  {
    key: 'instagram',
    label: 'Instagram (URL)',
    type: 'url',
    placeholder: 'https://www.instagram.com/…',
  },
  { key: 'tiktok', label: 'TikTok (URL)', type: 'url', placeholder: 'https://www.tiktok.com/@…' },
  { key: 'whatsapp', label: 'WhatsApp (URL)', type: 'url', placeholder: 'https://wa.me/…' },
  { key: 'phone', label: 'Телефон', type: 'text', placeholder: '614848301' },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'info@hsmuebles.es' },
];

export default function ContactEditor({ contact, onChange }) {
  const set = (key, value) => onChange((c) => ({ ...c, [key]: value }));
  const filled = CHANNELS.filter((ch) => contact?.[ch.key]).length;

  return (
    <Collapsible title="Контакты и соцсети" summary={`${filled} из ${CHANNELS.length} в подвале`}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CHANNELS.map((ch) => (
          <div key={ch.key} className={ch.key === 'email' ? 'sm:col-span-2' : ''}>
            <Field
              label={ch.label}
              type={ch.type}
              value={contact?.[ch.key]}
              onChange={(v) => set(ch.key, v)}
              placeholder={ch.placeholder}
            />
          </div>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-primary/75">
        Оставьте поле пустым, чтобы скрыть значок в футере.
      </p>
    </Collapsible>
  );
}
