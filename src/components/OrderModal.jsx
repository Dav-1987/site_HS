import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { trackPixel, setPixelUserData, buildUserData, getFbCookies } from '../lib/track.js';

const TITLE_ID = 'order-modal-title';

export default function OrderModal({ product, isOpen, onClose }) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');
  const dialogRef = useRef(null);

  // onClose is a fresh arrow function on every render of the parent — keep it
  // in a ref so the focus-trap effect below only re-runs on isOpen flips, not
  // on every unrelated re-render while the modal is open.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // A11y: trap Tab/Shift+Tab inside the dialog while open, autofocus the
  // first field on open, and restore focus to the trigger on close.
  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    const prevFocus = document.activeElement;
    const focusables = () =>
      dialog
        ? Array.from(dialog.querySelectorAll('button, input, textarea, [href], [tabindex]')).filter(
            (el) => el.tabIndex !== -1 && !el.disabled,
          )
        : [];

    dialog?.querySelector('input[name="name"]')?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (prevFocus instanceof HTMLElement) prevFocus.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setName(''); setPhone(''); setComment('');
      setErrors({}); setSending(false); setSent(false); setServerError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const productLabel = `${product.name}${product.subtitle ? ' ' + product.subtitle : ''}`;

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = t('order.form.error.required');
    if (!phone.trim()) e.phone = t('order.form.error.required');
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      // Not `form[fieldName]` — "name" collides with HTMLFormElement's own
      // `name` IDL property and resolves to a string, not the input.
      e.currentTarget.querySelector(`[name="${Object.keys(errs)[0]}"]`)?.focus();
      return;
    }
    setSending(true);
    setServerError('');
    try {
      const eventId =
        window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const { fbp, fbc } = getFbCookies();
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          comment: comment.trim() || undefined,
          productName: productLabel,
          productId: product.id,
          // Conversions API: shared event_id (dedup with the browser Lead) + match keys.
          eventId,
          fbp,
          fbc,
          eventSourceUrl: window.location.href,
          _gotcha: e.currentTarget._gotcha.value,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'error');
      setSent(true);
      // Advanced matching: feed the (browser-hashed) name + phone before the
      // Lead so Meta can attribute the conversion to the ad click.
      setPixelUserData(buildUserData({ name, phone }));
      trackPixel(
        'Lead',
        { content_type: 'product', content_ids: [product.id], content_name: productLabel },
        { eventID: eventId },
      );
    } catch {
      setServerError(t('order.form.error.generic'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={TITLE_ID}
    >
      <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-md bg-background shadow-floating">
        <button
          type="button"
          onClick={onClose}
          aria-label={t('nav.close')}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center text-xl text-primary/30 transition-colors hover:text-primary"
        >
          ×
        </button>

        <div className="p-8 pt-10">
          {sent ? (
            <div className="py-4 text-center">
              <p id={TITLE_ID} className="font-serif text-2xl font-light text-primary">
                {t('order.success.title').replace('{name}', name.trim())}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                {t('order.success.body')}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-8 text-xs uppercase tracking-[0.2em] text-accent hover:underline"
              >
                {t('nav.close')}
              </button>
            </div>
          ) : (
            <>
              <p className="mb-1 text-[10px] uppercase tracking-[0.25em] text-accent">
                {t('order.modal.eyebrow')}
              </p>
              <h2 id={TITLE_ID} className="font-serif text-xl font-light text-primary">{productLabel}</h2>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                <div>
                  <label className="mb-1 block text-[11px] uppercase tracking-[0.2em] text-primary/50">
                    {t('order.form.name')} *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })); }}
                    placeholder={t('order.form.name.placeholder')}
                    className="w-full border border-primary/20 bg-transparent px-3 py-2.5 text-sm text-primary outline-none transition-colors focus:border-accent"
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-[11px] uppercase tracking-[0.2em] text-primary/50">
                    {t('order.form.phone')} *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setErrors((p) => ({ ...p, phone: '' })); }}
                    placeholder={t('order.form.phone.placeholder')}
                    className="w-full border border-primary/20 bg-transparent px-3 py-2.5 text-sm text-primary outline-none transition-colors focus:border-accent"
                  />
                  {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-[11px] uppercase tracking-[0.2em] text-primary/50">
                    {t('order.form.comment')}
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    placeholder={t('order.form.comment.placeholder')}
                    className="w-full resize-none border border-primary/20 bg-transparent px-3 py-2.5 text-sm text-primary outline-none transition-colors focus:border-accent"
                  />
                </div>

                {serverError && <p className="text-xs text-red-500">{serverError}</p>}

                <input type="text" name="_gotcha" className="hidden" tabIndex={-1} aria-hidden="true" />

                <button
                  type="submit"
                  disabled={sending}
                  aria-busy={sending}
                  className="w-full bg-primary py-3.5 text-xs uppercase tracking-[0.25em] text-background transition-colors hover:bg-accent disabled:opacity-50"
                >
                  {sending ? t('order.form.sending') : t('order.form.submit')}
                </button>
                <p className="text-center text-[10px] leading-relaxed text-primary/40">
                  {t('order.form.privacyNotice')}
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
