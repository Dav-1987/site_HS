import { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import Reveal from '../components/Reveal.jsx';
import { LABEL, ERROR, SUBMIT, HONEYPOT, EMAIL_RE, inputClass } from '../components/formStyles.js';

export default function Contact() {
  const { t } = useLanguage();
  const { state } = useLocation();
  const formRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [errors, setErrors] = useState({});

  // When arriving from a product page, pre-fill the message with the piece name.
  const prefill = state?.product ? `${t('contact.prefill')} ${state.product}` : '';

  const fieldClass = (name) => inputClass(Boolean(errors[name]));

  const validate = (form) => {
    const next = {};
    if (!form.name.value.trim()) next.name = t('contact.form.error.required');
    const email = form.email.value.trim();
    if (!email) next.email = t('contact.form.error.required');
    else if (!EMAIL_RE.test(email)) next.email = t('contact.form.error.email');
    if (!form.message.value.trim()) next.message = t('contact.form.error.required');
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;

    // Honeypot: real users never see this field. If a bot fills it, pretend we
    // succeeded and silently drop the submission.
    if (form._gotcha.value) {
      setStatus('sent');
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
      // TODO(backend): POST these fields to /api/contact (email/Postgres) once the
      // endpoint exists. Until then we acknowledge locally so the user gets feedback.
      await new Promise((resolve) => setTimeout(resolve, 600));
      setStatus('sent');
      form.reset();
    } catch {
      setStatus('error');
    }
  };

  // Clear a field's error as soon as the user edits it.
  const clearError = (name) =>
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));

  const sending = status === 'sending';

  return (
    <section className="px-6 pb-24 pt-16 md:px-12 md:pb-32 md:pt-24 lg:px-20">
      <div className="grid gap-16 lg:grid-cols-12 lg:gap-24">
        {/* Intro + info */}
        <Reveal className="lg:col-span-5">
          <p className="mb-5 text-xs uppercase tracking-[0.3em] text-accent">
            {t('contact.eyebrow')}
          </p>
          <h1 className="font-serif text-5xl font-light leading-[1.02] tracking-tight text-primary md:text-6xl">
            {t('contact.title')}
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-secondary">
            {t('contact.subtitle')}
          </p>

          <div className="mt-12 space-y-6 border-t border-primary/10 pt-10">
            <div>
              <p className="mb-1 text-xs uppercase tracking-[0.2em] text-primary/40">
                {t('contact.info.title')}
              </p>
              <p className="text-secondary">Calle del Roble 12, 28004 Madrid</p>
            </div>
            <div>
              <p className="mb-1 text-xs uppercase tracking-[0.2em] text-primary/40">Email</p>
              <a href="mailto:hola@hsmuebles.es" className="text-secondary hover:text-accent">
                hola@hsmuebles.es
              </a>
            </div>
            <div>
              <p className="mb-1 text-xs uppercase tracking-[0.2em] text-primary/40">
                {t('contact.info.hours')}
              </p>
              <a href="tel:+34910000000" className="text-secondary hover:text-accent">
                +34 910 000 000
              </a>
            </div>
          </div>
        </Reveal>

        {/* Form */}
        <Reveal delay={0.1} className="lg:col-span-7">
          {status === 'sent' ? (
            <div
              role="status"
              className="flex h-full min-h-[20rem] flex-col items-center justify-center border border-accent/30 bg-surface p-10 text-center"
            >
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-accent text-accent">
                ✓
              </span>
              <p className="font-serif text-2xl font-light text-primary">
                {t('contact.form.sent')}
              </p>
            </div>
          ) : (
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-8" noValidate>
              {/* Honeypot — visually hidden, off the tab order, ignored by users. */}
              <input
                type="text"
                name="_gotcha"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className={HONEYPOT}
              />

              <div className="grid gap-8 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className={LABEL}>
                    {t('contact.form.name')}
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
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
                  <label htmlFor="email" className={LABEL}>
                    {t('contact.form.email')}
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    aria-required="true"
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
              </div>
              <div>
                <label htmlFor="message" className={LABEL}>
                  {t('contact.form.message')}
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  required
                  aria-required="true"
                  aria-invalid={errors.message ? 'true' : undefined}
                  aria-describedby={errors.message ? 'message-error' : undefined}
                  defaultValue={prefill}
                  placeholder={t('contact.form.message.placeholder')}
                  onInput={() => clearError('message')}
                  className={`${fieldClass('message')} resize-none`}
                />
                {errors.message && (
                  <p id="message-error" className={ERROR}>
                    {errors.message}
                  </p>
                )}
              </div>

              {status === 'error' && (
                <p role="alert" className="text-sm text-danger/90">
                  {t('contact.form.error.generic')}
                </p>
              )}

              <button
                type="submit"
                disabled={sending}
                aria-busy={sending}
                className={SUBMIT}
              >
                {sending ? t('contact.form.sending') : `${t('contact.form.submit')} →`}
              </button>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}
