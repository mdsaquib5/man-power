'use client';

import { useState, FormEvent } from 'react';
import styles from './page.module.css';

type FormState = 'idle' | 'loading' | 'success' | 'error' | 'duplicate';

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  companyName: string;
  message: string;
}

const INITIAL_FORM: FormData = {
  fullName: '',
  email: '',
  phone: '',
  companyName: '',
  message: '',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[\d\s\-().]{7,20}$/;

export default function Home() {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<FormData>>({});

  const validate = (): boolean => {
    const errors: Partial<FormData> = {};
    if (!form.fullName.trim()) errors.fullName = 'Full name is required.';
    else if (form.fullName.trim().length > 100) errors.fullName = 'Max 100 characters.';

    if (!form.email.trim()) errors.email = 'Email is required.';
    else if (!EMAIL_REGEX.test(form.email.trim())) errors.email = 'Enter a valid email.';

    if (!form.phone.trim()) errors.phone = 'Phone is required.';
    else if (!PHONE_REGEX.test(form.phone.trim())) errors.phone = 'Enter a valid phone number.';

    if (form.companyName.length > 150) errors.companyName = 'Max 150 characters.';
    if (form.message.length > 1000) errors.message = 'Max 1000 characters.';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (fieldErrors[name as keyof FormData]) {
      setFieldErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setFormState('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          companyName: form.companyName.trim() || undefined,
          message: form.message.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setFormState('duplicate');
        return;
      }
      if (!res.ok) {
        setErrorMsg(data.error || 'Something went wrong. Please try again.');
        setFormState('error');
        return;
      }

      setFormState('success');
      setForm(INITIAL_FORM);
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.');
      setFormState('error');
    }
  };

  return (
    <div className={styles.page}>
      {/* Animated background orbs */}
      <div className={styles.orb1} aria-hidden="true" />
      <div className={styles.orb2} aria-hidden="true" />
      <div className={styles.orb3} aria-hidden="true" />

      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            Coming Soon
          </div>
          <h1 className={styles.headline}>
            Something <span className={styles.gradientText}>extraordinary</span> is on its way.
          </h1>
          <p className={styles.subheadline}>
            We&apos;re building the next big thing. Be the first to know when we launch — join our exclusive early-access list.
          </p>
        </header>

        {/* Form card */}
        <div className={styles.card}>
          {formState === 'success' ? (
            <div className={styles.successState} role="alert">
              <div className={styles.successIcon}>✓</div>
              <h2 className={styles.successTitle}>You&apos;re on the list!</h2>
              <p className={styles.successText}>
                Thank you for your interest. We&apos;ll reach out as soon as we launch.
              </p>
              <button
                className={styles.resetBtn}
                onClick={() => setFormState('idle')}
              >
                Register another
              </button>
            </div>
          ) : formState === 'duplicate' ? (
            <div className={styles.duplicateState} role="alert">
              <div className={styles.duplicateIcon}>👋</div>
              <h2 className={styles.successTitle}>Already registered!</h2>
              <p className={styles.successText}>
                This email is already on our list. We&apos;ll be in touch soon!
              </p>
              <button
                className={styles.resetBtn}
                onClick={() => setFormState('idle')}
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className={styles.form} id="lead-form">
              <h2 className={styles.cardTitle}>Get Early Access</h2>
              <p className={styles.cardSubtitle}>Fill in your details and we&apos;ll notify you first.</p>

              <div className={styles.row}>
                <div className={styles.fieldGroup}>
                  <label htmlFor="fullName" className={styles.label}>Full Name *</label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    placeholder="Jane Smith"
                    value={form.fullName}
                    onChange={handleChange}
                    className={`${styles.input} ${fieldErrors.fullName ? styles.inputError : ''}`}
                    disabled={formState === 'loading'}
                    aria-describedby={fieldErrors.fullName ? 'fullName-error' : undefined}
                    aria-required="true"
                  />
                  {fieldErrors.fullName && (
                    <span id="fullName-error" className={styles.fieldError} role="alert">{fieldErrors.fullName}</span>
                  )}
                </div>

                <div className={styles.fieldGroup}>
                  <label htmlFor="email" className={styles.label}>Email Address *</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="jane@company.com"
                    value={form.email}
                    onChange={handleChange}
                    className={`${styles.input} ${fieldErrors.email ? styles.inputError : ''}`}
                    disabled={formState === 'loading'}
                    aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                    aria-required="true"
                  />
                  {fieldErrors.email && (
                    <span id="email-error" className={styles.fieldError} role="alert">{fieldErrors.email}</span>
                  )}
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.fieldGroup}>
                  <label htmlFor="phone" className={styles.label}>Phone Number *</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={handleChange}
                    className={`${styles.input} ${fieldErrors.phone ? styles.inputError : ''}`}
                    disabled={formState === 'loading'}
                    aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
                    aria-required="true"
                  />
                  {fieldErrors.phone && (
                    <span id="phone-error" className={styles.fieldError} role="alert">{fieldErrors.phone}</span>
                  )}
                </div>

                <div className={styles.fieldGroup}>
                  <label htmlFor="companyName" className={styles.label}>Company Name</label>
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    autoComplete="organization"
                    placeholder="Acme Corp (optional)"
                    value={form.companyName}
                    onChange={handleChange}
                    className={`${styles.input} ${fieldErrors.companyName ? styles.inputError : ''}`}
                    disabled={formState === 'loading'}
                  />
                  {fieldErrors.companyName && (
                    <span className={styles.fieldError} role="alert">{fieldErrors.companyName}</span>
                  )}
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="message" className={styles.label}>Message</label>
                <textarea
                  id="message"
                  name="message"
                  rows={3}
                  placeholder="Tell us what you're looking for... (optional)"
                  value={form.message}
                  onChange={handleChange}
                  className={`${styles.input} ${styles.textarea} ${fieldErrors.message ? styles.inputError : ''}`}
                  disabled={formState === 'loading'}
                />
                <span className={styles.charCount}>{form.message.length}/1000</span>
                {fieldErrors.message && (
                  <span className={styles.fieldError} role="alert">{fieldErrors.message}</span>
                )}
              </div>

              {formState === 'error' && (
                <div className={styles.errorBanner} role="alert">
                  <span>⚠️</span> {errorMsg}
                </div>
              )}

              <button
                type="submit"
                id="submit-btn"
                className={styles.submitBtn}
                disabled={formState === 'loading'}
                aria-busy={formState === 'loading'}
              >
                {formState === 'loading' ? (
                  <span className={styles.spinner} aria-label="Submitting…" />
                ) : (
                  'Notify Me at Launch →'
                )}
              </button>

              <p className={styles.privacyNote}>
                🔒 We respect your privacy. No spam, ever.
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
