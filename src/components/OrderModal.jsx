import { useEffect, useId, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import {
  trackPixel,
  setPixelUserData,
  buildUserData,
  getFbCookies,
  trackGoogleAdsLead,
  trackGa4Lead,
  buildGoogleUserData,
  setGoogleAdsUserData,
} from '../lib/track.js';
import { getAttribution } from '../lib/attribution.js';
import { productDiscount, productLabel } from '../data/catalog.js';

// Mirrors server/order.js's isValidPhone — kept in sync manually since client
// and server are separate deploy targets. Loosely validates digits with an
// optional leading + and spaces/dashes/parens as separators, catching typos
// (letters, too few/many digits) without rejecting real international numbers.
const PHONE_CHARS_RE = /^\+?[0-9\s\-().]+$/;
function isValidPhone(phone) {
  const trimmed = phone.trim();
  if (!trimmed || !PHONE_CHARS_RE.test(trimmed)) return false;
  const digits = (trimmed.match(/\d/g) || []).length;
  return digits >= 7 && digits <= 15;
}

// Mirrors server/order.js's isValidPostalCode — same manual-sync caveat.
const POSTAL_CODE_RE = /^[A-Za-z0-9][A-Za-z0-9\s-]{1,10}[A-Za-z0-9]$/;
function isValidPostalCode(postalCode) {
  return POSTAL_CODE_RE.test(postalCode.trim());
}

export default function OrderModal({ product, isOpen, onClose }) {
  const { t } = useLanguage();
  const idPrefix = useId();
  const fieldIds = {
    title: `${idPrefix}-title`,
    name: `${idPrefix}-name`,
    nameError: `${idPrefix}-name-error`,
    phone: `${idPrefix}-phone`,
    phoneError: `${idPrefix}-phone-error`,
    postalCode: `${idPrefix}-postal-code`,
    postalCodeError: `${idPrefix}-postal-code-error`,
    address: `${idPrefix}-address`,
    comment: `${idPrefix}-comment`,
  };
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [address, setAddress] = useState('');
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');
  const dialogRef = useRef(null);
  const eventIdRef = useRef('');

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
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setPhone('');
      setPostalCode('');
      setAddress('');
      setComment('');
      setErrors({});
      setSending(false);
      setSent(false);
      setServerError('');
      // Keep one id across network retries while this order dialog is open.
      // The server uses it as the durable idempotency key.
      eventIdRef.current =
        window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      // Opening the form is the only signal between viewing a product and
      // actually sending a request. Leads are rare enough that Meta cannot
      // optimise on them alone, so give it this mid-funnel step too.
      trackPixel('InitiateCheckout', {
        content_type: 'product',
        content_ids: [product.id],
        content_name: productLabel(product),
        ...(productDiscount(product).price > 0
          ? { value: productDiscount(product).price, currency: 'EUR' }
          : null),
      });
    }
    // `product` is read only to describe the dialog that just opened; it cannot
    // change while the dialog is open, so re-running on it would only re-fire
    // the event.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const label = productLabel(product);
  const { price } = productDiscount(product);

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = t('order.form.error.required');
    if (!phone.trim()) e.phone = t('order.form.error.required');
    else if (!isValidPhone(phone)) e.phone = t('order.form.error.phone');
    if (!postalCode.trim()) e.postalCode = t('order.form.error.required');
    else if (!isValidPostalCode(postalCode)) e.postalCode = t('order.form.error.postalCode');
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
      const eventId = eventIdRef.current;
      const { fbp, fbc } = getFbCookies();
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          postalCode,
          address: address.trim() || undefined,
          comment: comment.trim() || undefined,
          productId: product.id,
          // Which channel brought this visitor (captured on their landing page).
          attribution: getAttribution() ?? undefined,
          // Conversions API: shared event_id (dedup with the browser Lead) + match keys.
          eventId,
          fbp,
          fbc,
          eventSourceUrl: window.location.href,
          _gotcha: e.currentTarget.elements.namedItem('_gotcha')?.value ?? '',
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
        {
          content_type: 'product',
          content_ids: [product.id],
          content_name: label,
          // The product's price, not a lead's expected worth — Meta only needs a
          // consistent scale to tell a cheap enquiry from an expensive one.
          ...(price > 0 ? { value: price, currency: 'EUR' } : null),
        },
        { eventID: eventId },
      );
      // Enhanced conversions: the customer data has to be set before the
      // conversion fires, not after — gtag reads whatever is set at that moment.
      setGoogleAdsUserData(buildGoogleUserData({ name, phone, postalCode }));
      // Google Ads "Lead" conversion, fired on the same successful submit. Its
      // value is fixed at 1 EUR by the conversion action itself, so the product
      // price goes to GA4 and Meta only.
      trackGoogleAdsLead();
      trackGa4Lead({ value: price });
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
      aria-labelledby={fieldIds.title}
    >
      <div
        className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md bg-background shadow-floating">
        <button
          type="button"
          onClick={onClose}
          aria-label={t('nav.close')}
          className="touch-target absolute right-2 top-2 flex items-center justify-center text-xl text-primary/50 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          ×
        </button>

        <div className="p-8 pt-10">
          {sent ? (
            <div className="py-4 text-center">
              <p id={fieldIds.title} className="font-serif text-2xl font-light text-primary">
                {t('order.success.title').replace('{name}', name.trim())}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                {t('order.success.body')}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="touch-target mt-6 inline-flex items-center px-2 text-xs uppercase tracking-[0.2em] text-accent-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {t('nav.close')}
              </button>
            </div>
          ) : (
            <>
              <p className="mb-1 text-xs uppercase tracking-[0.25em] text-accent-text">
                {t('order.modal.eyebrow')}
              </p>
              <h2 id={fieldIds.title} className="font-serif text-xl font-light text-primary">
                {label}
              </h2>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                <div>
                  <label
                    htmlFor={fieldIds.name}
                    className="mb-1 block text-xs uppercase tracking-[0.2em] text-primary/70"
                  >
                    {t('order.form.name')} *
                  </label>
                  <input
                    id={fieldIds.name}
                    type="text"
                    name="name"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setErrors((p) => ({ ...p, name: '' }));
                    }}
                    placeholder={t('order.form.name.placeholder')}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? fieldIds.nameError : undefined}
                    className="w-full border border-primary/20 bg-transparent px-3 py-2.5 text-sm text-primary outline-none transition-colors focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
                  />
                  {errors.name && (
                    <p id={fieldIds.nameError} role="alert" className="mt-1 text-xs text-danger">
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor={fieldIds.phone}
                    className="mb-1 block text-xs uppercase tracking-[0.2em] text-primary/70"
                  >
                    {t('order.form.phone')} *
                  </label>
                  <input
                    id={fieldIds.phone}
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setErrors((p) => ({ ...p, phone: '' }));
                    }}
                    placeholder={t('order.form.phone.placeholder')}
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? fieldIds.phoneError : undefined}
                    className="w-full border border-primary/20 bg-transparent px-3 py-2.5 text-sm text-primary outline-none transition-colors focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
                  />
                  {errors.phone && (
                    <p id={fieldIds.phoneError} role="alert" className="mt-1 text-xs text-danger">
                      {errors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor={fieldIds.postalCode}
                    className="mb-1 block text-xs uppercase tracking-[0.2em] text-primary/70"
                  >
                    {t('order.form.postalCode')} *
                  </label>
                  <input
                    id={fieldIds.postalCode}
                    type="text"
                    name="postalCode"
                    autoComplete="postal-code"
                    inputMode="numeric"
                    value={postalCode}
                    onChange={(e) => {
                      setPostalCode(e.target.value);
                      setErrors((p) => ({ ...p, postalCode: '' }));
                    }}
                    placeholder={t('order.form.postalCode.placeholder')}
                    aria-invalid={Boolean(errors.postalCode)}
                    aria-describedby={errors.postalCode ? fieldIds.postalCodeError : undefined}
                    className="w-full border border-primary/20 bg-transparent px-3 py-2.5 text-sm text-primary outline-none transition-colors focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
                  />
                  {errors.postalCode && (
                    <p
                      id={fieldIds.postalCodeError}
                      role="alert"
                      className="mt-1 text-xs text-danger"
                    >
                      {errors.postalCode}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor={fieldIds.address}
                    className="mb-1 block text-xs uppercase tracking-[0.2em] text-primary/70"
                  >
                    {t('order.form.address')}
                  </label>
                  <input
                    id={fieldIds.address}
                    type="text"
                    name="address"
                    autoComplete="street-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={t('order.form.address.placeholder')}
                    className="w-full border border-primary/20 bg-transparent px-3 py-2.5 text-sm text-primary outline-none transition-colors focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
                  />
                </div>

                <div>
                  <label
                    htmlFor={fieldIds.comment}
                    className="mb-1 block text-xs uppercase tracking-[0.2em] text-primary/70"
                  >
                    {t('order.form.comment')}
                  </label>
                  <textarea
                    id={fieldIds.comment}
                    name="comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    placeholder={t('order.form.comment.placeholder')}
                    className="w-full resize-none border border-primary/20 bg-transparent px-3 py-2.5 text-sm text-primary outline-none transition-colors focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
                  />
                </div>

                {serverError && (
                  <p role="alert" aria-live="assertive" className="text-xs text-danger">
                    {serverError}
                  </p>
                )}

                <input
                  type="text"
                  name="_gotcha"
                  className="hidden"
                  tabIndex={-1}
                  aria-hidden="true"
                />

                <button
                  type="submit"
                  disabled={sending}
                  aria-busy={sending}
                  className="touch-target w-full bg-primary px-4 text-xs uppercase tracking-[0.25em] text-background transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50"
                >
                  {sending ? t('order.form.sending') : t('order.form.submit')}
                </button>
                <p className="text-center text-xs leading-relaxed text-primary/60">
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
