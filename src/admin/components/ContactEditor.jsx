import { useState } from 'react';

const FIELD_CLASS =
  'w-full border border-primary/20 bg-background px-3 py-2 text-sm text-primary outline-none transition-colors focus:border-accent';
const LABEL_CLASS = 'mb-1 block text-[11px] uppercase tracking-[0.18em] text-primary/40';

export default function ContactEditor({ contact, onChange }) {
  const [open, setOpen] = useState(false);
  const set = (key, value) => onChange({ ...contact, [key]: value });

  return (
    <div className="border border-primary/15 bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <span className={`text-base transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
        <span className="font-serif text-xl font-light text-primary">Контакты и соцсети</span>
        <span className="text-xs uppercase tracking-[0.18em] text-primary/40">Footer</span>
      </button>

      {open && (
        <div className="border-t border-primary/10 px-5 py-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL_CLASS}>Instagram (URL)</label>
              <input
                type="url"
                value={contact.instagram}
                onChange={(e) => set('instagram', e.target.value)}
                placeholder="https://www.instagram.com/…"
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>TikTok (URL)</label>
              <input
                type="url"
                value={contact.tiktok}
                onChange={(e) => set('tiktok', e.target.value)}
                placeholder="https://www.tiktok.com/@…"
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>WhatsApp (URL)</label>
              <input
                type="url"
                value={contact.whatsapp}
                onChange={(e) => set('whatsapp', e.target.value)}
                placeholder="https://wa.me/…"
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Телефон</label>
              <input
                type="text"
                value={contact.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="614848301"
                className={FIELD_CLASS}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS}>Email</label>
              <input
                type="email"
                value={contact.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="info@hsmuebles.es"
                className={FIELD_CLASS}
              />
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-primary/40">
            Оставьте поле пустым, чтобы скрыть значок в футере.
          </p>
        </div>
      )}
    </div>
  );
}
