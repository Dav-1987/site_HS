import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useCatalog } from '../catalog/CatalogContext.jsx';
import { useCart } from '../cart/CartContext.jsx';
import { cartLines, cartTotal, MAX_QTY } from '../cart/cartUtils.js';
import { productImages } from '../data/catalog.js';
import { LABEL, ERROR, SUBMIT, HONEYPOT, EMAIL_RE, inputClass } from '../components/formStyles.js';
import Media from '../components/Media.jsx';
import Price from '../components/Price.jsx';
import Reveal from '../components/Reveal.jsx';
import Button from '../components/Button.jsx';

const QTY_BTN =
  'flex h-9 w-9 items-center justify-center text-base text-primary/60 transition-colors duration-300 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-primary/60';

function CartLine({ line, onQty, onRemove }) {
  const { lang, t } = useLanguage();
  const { product, category, qty, lineTotal } = line;
  const to = `/${category.slug}/${product.id}`;

  return (
    <li className="flex gap-5 border-b border-primary/10 py-6">
      <Link
        to={to}
        tabIndex={-1}
        aria-hidden="true"
        className="block w-20 shrink-0 sm:w-24"
      >
        <div className="aspect-[4/5] overflow-hidden bg-surface">
          <Media id={productImages(product)[0]} alt="" w={300} />
        </div>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              to={to}
              className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              <h3 className="truncate font-serif text-lg text-primary transition-colors duration-300 hover:text-accent">
                {product.name}
              </h3>
            </Link>
            <p className="mt-1 text-[11px] uppercase tracking-[0.15em] text-primary/40">
              {category.name[lang]}
            </p>
            <Price product={product} className="mt-1.5 text-sm text-primary/60" />
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`${t('cart.item.remove')}: ${product.name}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center text-xl leading-none text-primary/40 transition-colors duration-300 hover:text-danger focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            ×
          </button>
        </div>

        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="flex items-center border border-primary/15">
            <button
              type="button"
              onClick={() => onQty(qty - 1)}
              aria-label={`${t('cart.qty.decrease')}: ${product.name}`}
              className={QTY_BTN}
            >
              −
            </button>
            <span className="w-8 text-center text-sm text-primary">{qty}</span>
            <button
              type="button"
              onClick={() => onQty(qty + 1)}
              disabled={qty >= MAX_QTY}
              aria-label={`${t('cart.qty.increase')}: ${product.name}`}
              className={QTY_BTN}
            >
              +
            </button>
          </div>
          <span className="font-serif text-lg text-primary">
            {lineTotal} {t('common.currency')}
          </span>
        </div>
      </div>
    </li>
  );
}

export default function Cart() {
  const { t } = useLanguage();
  const { categories } = useCatalog();
  const { items, setQty, remove, clear } = useCart();
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [errors, setErrors] = useState({});

  const lines = cartLines(items, categories);
  const total = cartTotal(lines);

  const fieldClass = (name) => inputClass(Boolean(errors[name]));
  const clearError = (name) =>
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));

  const validate = (form) => {
    const next = {};
    if (!form.name.value.trim()) next.name = t('contact.form.error.required');
    if (!form.phone.value.trim()) next.phone = t('contact.form.error.required');
    const email = form.email.value.trim();
    if (email && !EMAIL_RE.test(email)) next.email = t('contact.form.error.email');
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;

    // Honeypot: bots fill the hidden field — pretend success, drop the order.
    if (form._gotcha.value) {
      setStatus('sent');
      clear();
      return;
    }

    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      form[Object.keys(found)[0]]?.focus();
      return;
    }

    setStatus('sending');
    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.value.trim(),
          phone: form.phone.value.trim(),
          email: form.email.value.trim(),
          comment: form.comment.value.trim(),
          items: lines.map((l) => ({ id: l.product.id, qty: l.qty })),
        }),
      });
      if (!res.ok) throw new Error(`order failed: ${res.status}`);
      setStatus('sent');
      clear();
    } catch {
      setStatus('error');
    }
  };

  const sending = status === 'sending';

  // Order sent: the cart is already cleared, show the confirmation screen.
  if (status === 'sent') {
    return (
      <section className="px-6 pb-24 pt-16 md:px-12 md:pb-32 md:pt-24 lg:px-20">
        <div
          role="status"
          className="mx-auto flex min-h-[24rem] max-w-xl flex-col items-center justify-center border border-accent/30 bg-surface p-10 text-center"
        >
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-accent text-accent">
            ✓
          </span>
          <p className="font-serif text-2xl font-light text-primary">{t('cart.form.sent.title')}</p>
          <p className="mt-3 text-sm leading-relaxed text-secondary">{t('cart.form.sent.body')}</p>
          <Button to="/catalogo" variant="outline" className="mt-8">
            {t('cart.browse')} →
          </Button>
        </div>
      </section>
    );
  }

  if (lines.length === 0) {
    return (
      <section className="px-6 pb-24 pt-16 md:px-12 md:pb-32 md:pt-24 lg:px-20">
        <div className="mx-auto flex min-h-[24rem] max-w-xl flex-col items-center justify-center text-center">
          <h1 className="font-serif text-4xl font-light tracking-tight text-primary md:text-5xl">
            {t('cart.title')}
          </h1>
          <p className="mt-4 text-secondary">{t('cart.empty')}</p>
          <Button to="/catalogo" variant="solid" className="mt-8">
            {t('cart.browse')} →
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 pb-24 pt-16 md:px-12 md:pb-32 md:pt-24 lg:px-20">
      <Reveal>
        <p className="mb-5 text-xs uppercase tracking-[0.3em] text-accent">{t('cart.eyebrow')}</p>
        <h1 className="font-serif text-5xl font-light leading-[1.02] tracking-tight text-primary md:text-6xl">
          {t('cart.title')}
        </h1>
      </Reveal>

      <div className="mt-12 grid gap-16 lg:grid-cols-12 lg:gap-24">
        {/* Lines */}
        <Reveal className="lg:col-span-7">
          <ul className="border-t border-primary/10">
            {lines.map((line) => (
              <CartLine
                key={line.product.id}
                line={line}
                onQty={(qty) => setQty(line.product.id, qty)}
                onRemove={() => remove(line.product.id)}
              />
            ))}
          </ul>
        </Reveal>

        {/* Summary + checkout */}
        <Reveal delay={0.1} className="lg:col-span-5">
          <div className="flex items-baseline justify-between border-b border-primary/10 pb-5">
            <span className="text-xs uppercase tracking-[0.2em] text-primary/40">
              {t('cart.total')}
            </span>
            <span className="font-serif text-3xl text-primary">
              {total} {t('common.currency')}
            </span>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-primary/40">{t('cart.note')}</p>

          <h2 className="mt-10 font-serif text-2xl font-light text-primary">
            {t('cart.form.title')}
          </h2>

          <form onSubmit={handleSubmit} className="mt-6 space-y-7" noValidate>
            <input
              type="text"
              name="_gotcha"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className={HONEYPOT}
            />

            <div>
              <label htmlFor="name" className={LABEL}>
                {t('contact.form.name')}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                aria-required="true"
                aria-invalid={errors.name ? 'true' : undefined}
                aria-describedby={errors.name ? 'name-error' : undefined}
                onInput={() => clearError('name')}
                className={fieldClass('name')}
              />
              {errors.name && (
                <p id="name-error" className={ERROR}>
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className={LABEL}>
                {t('cart.form.phone')}
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                aria-required="true"
                aria-invalid={errors.phone ? 'true' : undefined}
                aria-describedby={errors.phone ? 'phone-error' : undefined}
                onInput={() => clearError('phone')}
                className={fieldClass('phone')}
              />
              {errors.phone && (
                <p id="phone-error" className={ERROR}>
                  {errors.phone}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className={LABEL}>
                {t('cart.form.email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                aria-invalid={errors.email ? 'true' : undefined}
                aria-describedby={errors.email ? 'email-error' : undefined}
                onInput={() => clearError('email')}
                className={fieldClass('email')}
              />
              {errors.email && (
                <p id="email-error" className={ERROR}>
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="comment" className={LABEL}>
                {t('cart.form.comment')}
              </label>
              <textarea
                id="comment"
                name="comment"
                rows={3}
                placeholder={t('cart.form.comment.placeholder')}
                className={`${fieldClass('comment')} resize-none`}
              />
            </div>

            {status === 'error' && (
              <p role="alert" className="text-sm text-danger/90">
                {t('contact.form.error.generic')}
              </p>
            )}

            <button type="submit" disabled={sending} aria-busy={sending} className={SUBMIT}>
              {sending ? t('contact.form.sending') : `${t('cart.form.submit')} →`}
            </button>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
