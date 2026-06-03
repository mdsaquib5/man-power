'use client';

import { useState, useRef, DragEvent, ChangeEvent, FormEvent } from 'react';
import {
  FiUser,
  FiMail,
  FiPhone,
  FiBriefcase,
  FiDollarSign,
  FiClock,
  FiUpload,
  FiSend,
  FiCheckCircle,
  FiAlertCircle,
  FiGlobe,
  FiX,
  FiFileText,
} from 'react-icons/fi';
import styles from './page.module.css';

/* ─── Types ─────────────────────────────────────────── */

type FormState = 'idle' | 'loading' | 'success' | 'error' | 'duplicate';

interface CareerFormData {
  fullName: string;
  email: string;
  phone: string;
  jobProfile: string;
  experienceType: string;
  currentSalary: string;
  experience: string;
}

interface FieldErrors extends Partial<CareerFormData> {
  resume?: string;
}

const INITIAL_FORM: CareerFormData = {
  fullName: '',
  email: '',
  phone: '',
  jobProfile: '',
  experienceType: '',
  currentSalary: '',
  experience: '',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[\d\s\-().]{7,20}$/;
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const JOB_PROFILES = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'UI/UX Designer',
  'Project Manager',
  'DevOps Engineer',
  'Data Scientist',
];

const EXPERIENCE_TYPES = ['Indian Experience', 'Gulf Experience'];

/* ─── Component ──────────────────────────────────────── */

export default function CareerPage() {
  const [form, setForm] = useState<CareerFormData>(INITIAL_FORM);
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Validation ── */
  const validate = (): boolean => {
    const errors: FieldErrors = {};

    if (!form.fullName.trim()) errors.fullName = 'Full name is required.';
    else if (form.fullName.trim().length > 100) errors.fullName = 'Max 100 characters.';

    if (!form.email.trim()) errors.email = 'Email is required.';
    else if (!EMAIL_REGEX.test(form.email.trim())) errors.email = 'Enter a valid email.';

    if (!form.phone.trim()) errors.phone = 'Phone number is required.';
    else if (!PHONE_REGEX.test(form.phone.trim())) errors.phone = 'Enter a valid phone number.';

    if (!form.jobProfile) errors.jobProfile = 'Please select a job profile.';
    if (!form.experienceType) errors.experienceType = 'Please select experience type.';

    if (resumeFile) {
      const ext = '.' + resumeFile.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) errors.resume = 'Only PDF, DOC, DOCX files are allowed.';
      else if (resumeFile.size > MAX_FILE_SIZE) errors.resume = 'File must be 5 MB or smaller.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ── Field change ── */
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof FieldErrors]) {
      setFieldErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  /* ── File handling ── */
  const handleFileSelect = (file: File) => {
    setResumeFile(file);
    if (fieldErrors.resume) setFieldErrors(prev => ({ ...prev, resume: undefined }));
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const removeFile = () => {
    setResumeFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /* ── Submit ── */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setFormState('loading');
    setErrorMsg('');

    try {
      const payload = new FormData();
      Object.entries(form).forEach(([k, v]) => payload.append(k, v));
      if (resumeFile) payload.append('resume', resumeFile);

      const res = await fetch('/api/apply', {
        method: 'POST',
        body: payload,
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
      setResumeFile(null);
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.');
      setFormState('error');
    }
  };

  /* ── Reset ── */
  const reset = () => {
    setFormState('idle');
    setForm(INITIAL_FORM);
    setResumeFile(null);
    setFieldErrors({});
    setErrorMsg('');
  };

  /* ─────────────────────────────────────────────────── */

  return (
    <div className={styles.page}>
      {/* Top decorative strip */}
      <div className={styles.topStrip} aria-hidden="true" />

      <div className={styles.container}>

        {/* ── Navbar ── */}
        <nav className={styles.navbar}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <FiGlobe size={20} />
            </div>
            <span className={styles.logoText}>CareerPortal</span>
          </div>
          <span className={styles.navBadge}>Now Hiring</span>
        </nav>

        {/* ── Hero ── */}
        <header className={styles.hero}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeDot} />
            Open Positions Available
          </div>
          <h1 className={styles.heroHeading}>
            Build Your Career<br />
            <span className={styles.heroAccent}>With Us</span>
          </h1>
          <p className={styles.heroSubtext}>
            Join a passionate team building the next generation of digital products.
            We value talent, growth, and ambition — apply today and let&apos;s grow together.
          </p>

          {/* Stats row */}
          <div className={styles.statsRow}>
            {[
              { value: '50+', label: 'Open Roles' },
              { value: '200+', label: 'Team Members' },
              { value: '15+', label: 'Countries' },
            ].map(stat => (
              <div key={stat.label} className={styles.statItem}>
                <span className={styles.statValue}>{stat.value}</span>
                <span className={styles.statLabel}>{stat.label}</span>
              </div>
            ))}
          </div>
        </header>

        {/* ── Form Card ── */}
        <main className={styles.formSection}>
          <div className={styles.card}>

            {formState === 'success' ? (
              <div className={styles.resultState} role="alert">
                <div className={`${styles.resultIcon} ${styles.successIcon}`}>
                  <FiCheckCircle size={36} />
                </div>
                <h2 className={styles.resultTitle}>Application Submitted!</h2>
                <p className={styles.resultText}>
                  Thank you, <strong>{form.fullName || 'Applicant'}</strong>! We&apos;ve received your application and will
                  be in touch within 3–5 business days.
                </p>
                <button className={styles.resetBtn} onClick={reset} id="apply-again-btn">
                  Apply for Another Role
                </button>
              </div>

            ) : formState === 'duplicate' ? (
              <div className={styles.resultState} role="alert">
                <div className={`${styles.resultIcon} ${styles.duplicateIcon}`}>
                  <FiAlertCircle size={36} />
                </div>
                <h2 className={styles.resultTitle}>Already Applied!</h2>
                <p className={styles.resultText}>
                  We already have an application on file for this email address. Our team will reach out soon!
                </p>
                <button className={styles.resetBtn} onClick={reset} id="try-another-email-btn">
                  Use a Different Email
                </button>
              </div>

            ) : (
              <form onSubmit={handleSubmit} noValidate className={styles.form} id="career-application-form">

                <div className={styles.formHeader}>
                  <h2 className={styles.cardTitle}>Submit Your Application</h2>
                  <p className={styles.cardSubtitle}>
                    All fields marked with <span className={styles.required}>*</span> are required.
                  </p>
                </div>

                {/* ── Row 1: Name + Email ── */}
                <div className={styles.row}>
                  <div className={styles.fieldGroup}>
                    <label htmlFor="fullName" className={styles.label}>
                      <FiUser className={styles.labelIcon} />
                      Full Name <span className={styles.required}>*</span>
                    </label>
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
                      aria-required="true"
                      aria-describedby={fieldErrors.fullName ? 'fullName-error' : undefined}
                    />
                    {fieldErrors.fullName && (
                      <span id="fullName-error" className={styles.fieldError} role="alert">
                        {fieldErrors.fullName}
                      </span>
                    )}
                  </div>

                  <div className={styles.fieldGroup}>
                    <label htmlFor="email" className={styles.label}>
                      <FiMail className={styles.labelIcon} />
                      Email Address <span className={styles.required}>*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="jane@example.com"
                      value={form.email}
                      onChange={handleChange}
                      className={`${styles.input} ${fieldErrors.email ? styles.inputError : ''}`}
                      disabled={formState === 'loading'}
                      aria-required="true"
                      aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                    />
                    {fieldErrors.email && (
                      <span id="email-error" className={styles.fieldError} role="alert">
                        {fieldErrors.email}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Row 2: Phone + Job Profile ── */}
                <div className={styles.row}>
                  <div className={styles.fieldGroup}>
                    <label htmlFor="phone" className={styles.label}>
                      <FiPhone className={styles.labelIcon} />
                      Phone Number <span className={styles.required}>*</span>
                    </label>
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
                      aria-required="true"
                      aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
                    />
                    {fieldErrors.phone && (
                      <span id="phone-error" className={styles.fieldError} role="alert">
                        {fieldErrors.phone}
                      </span>
                    )}
                  </div>

                  <div className={styles.fieldGroup}>
                    <label htmlFor="jobProfile" className={styles.label}>
                      <FiBriefcase className={styles.labelIcon} />
                      Job Profile <span className={styles.required}>*</span>
                    </label>
                    <select
                      id="jobProfile"
                      name="jobProfile"
                      value={form.jobProfile}
                      onChange={handleChange}
                      className={`${styles.input} ${styles.select} ${fieldErrors.jobProfile ? styles.inputError : ''}`}
                      disabled={formState === 'loading'}
                      aria-required="true"
                      aria-describedby={fieldErrors.jobProfile ? 'jobProfile-error' : undefined}
                    >
                      <option value="">Select a role…</option>
                      {JOB_PROFILES.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    {fieldErrors.jobProfile && (
                      <span id="jobProfile-error" className={styles.fieldError} role="alert">
                        {fieldErrors.jobProfile}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Row 3: Experience Type + Current Salary ── */}
                <div className={styles.row}>
                  <div className={styles.fieldGroup}>
                    <label htmlFor="experienceType" className={styles.label}>
                      <FiGlobe className={styles.labelIcon} />
                      Experience Type <span className={styles.required}>*</span>
                    </label>
                    <select
                      id="experienceType"
                      name="experienceType"
                      value={form.experienceType}
                      onChange={handleChange}
                      className={`${styles.input} ${styles.select} ${fieldErrors.experienceType ? styles.inputError : ''}`}
                      disabled={formState === 'loading'}
                      aria-required="true"
                      aria-describedby={fieldErrors.experienceType ? 'expType-error' : undefined}
                    >
                      <option value="">Select type…</option>
                      {EXPERIENCE_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    {fieldErrors.experienceType && (
                      <span id="expType-error" className={styles.fieldError} role="alert">
                        {fieldErrors.experienceType}
                      </span>
                    )}
                  </div>

                  <div className={styles.fieldGroup}>
                    <label htmlFor="currentSalary" className={styles.label}>
                      <FiDollarSign className={styles.labelIcon} />
                      Current Salary (₹ / year)
                    </label>
                    <input
                      id="currentSalary"
                      name="currentSalary"
                      type="number"
                      min="0"
                      placeholder="e.g. 800000"
                      value={form.currentSalary}
                      onChange={handleChange}
                      className={styles.input}
                      disabled={formState === 'loading'}
                    />
                  </div>
                </div>

                {/* ── Row 4: Experience (years) ── */}
                <div className={styles.rowHalf}>
                  <div className={styles.fieldGroup}>
                    <label htmlFor="experience" className={styles.label}>
                      <FiClock className={styles.labelIcon} />
                      Total Experience
                    </label>
                    <div className={styles.inputWithSuffix}>
                      <input
                        id="experience"
                        name="experience"
                        type="number"
                        min="0"
                        max="50"
                        step="0.5"
                        placeholder="e.g. 3"
                        value={form.experience}
                        onChange={handleChange}
                        className={`${styles.input} ${styles.inputSuffixed}`}
                        disabled={formState === 'loading'}
                      />
                      <span className={styles.inputSuffix}>years</span>
                    </div>
                  </div>
                </div>

                {/* ── Resume Upload ── */}
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    <FiUpload className={styles.labelIcon} />
                    Resume / CV
                  </label>

                  {resumeFile ? (
                    <div className={styles.filePreview}>
                      <FiFileText size={20} className={styles.fileIcon} />
                      <div className={styles.fileInfo}>
                        <span className={styles.fileName}>{resumeFile.name}</span>
                        <span className={styles.fileSize}>{formatFileSize(resumeFile.size)}</span>
                      </div>
                      <button
                        type="button"
                        className={styles.removeFileBtn}
                        onClick={removeFile}
                        aria-label="Remove resume"
                        id="remove-resume-btn"
                      >
                        <FiX size={16} />
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''} ${fieldErrors.resume ? styles.dropZoneError : ''}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      role="button"
                      tabIndex={0}
                      id="resume-dropzone"
                      onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
                      aria-label="Upload resume file"
                    >
                      <div className={styles.dropZoneIcon}>
                        <FiUpload size={24} />
                      </div>
                      <p className={styles.dropZoneText}>
                        <strong>Drag &amp; drop</strong> your resume here, or{' '}
                        <span className={styles.dropZoneLink}>click to browse</span>
                      </p>
                      <p className={styles.dropZoneHint}>PDF, DOC, DOCX — max 5 MB</p>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileInputChange}
                    className={styles.hiddenInput}
                    id="resume-file-input"
                    aria-label="Upload resume"
                  />
                  {fieldErrors.resume && (
                    <span className={styles.fieldError} role="alert">{fieldErrors.resume}</span>
                  )}
                </div>

                {/* ── Error Banner ── */}
                {formState === 'error' && (
                  <div className={styles.errorBanner} role="alert">
                    <FiAlertCircle size={16} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* ── Submit ── */}
                <button
                  type="submit"
                  id="submit-application-btn"
                  className={styles.submitBtn}
                  disabled={formState === 'loading'}
                  aria-busy={formState === 'loading'}
                >
                  {formState === 'loading' ? (
                    <>
                      <span className={styles.spinner} aria-hidden="true" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <FiSend size={18} />
                      Submit Application
                    </>
                  )}
                </button>

                <p className={styles.privacyNote}>
                  🔒 Your information is kept confidential and never shared with third parties.
                </p>
              </form>
            )}
          </div>
        </main>

        {/* ── Footer ── */}
        <footer className={styles.footer}>
          <p>© {new Date().getFullYear()} CareerPortal. All rights reserved.</p>
        </footer>

      </div>
    </div>
  );
}
