import { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';

export default function OrderModal({ product, isOpen, onClose }) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

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
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSending(true);
    setServerError('');
    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          comment: comment.trim() || undefined,
          productName: productLabel,
          productId: product.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'error');
      setSent(true);
    } catch {
      setServerError(t('order.form.error.generic'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
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
              <p className="font-serif text-2xl font-light text-primary">
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
              <h2 className="font-serif text-xl font-light text-primary">{productLabel}</h2>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                <div>
                  <label className="mb-1 block text-[11px] uppercase tracking-[0.2em] text-primary/50">
                    {t('order.form.name')} *
                  </label>
                  <input
                    type="text"
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
