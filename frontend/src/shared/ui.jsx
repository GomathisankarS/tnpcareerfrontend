import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AlertCircle, ArrowRight, BriefcaseBusiness, MapPin, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
export function Button({ children, busy, variant = '', ...props }) {
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      className={`button ${variant} ${props.className || ''}`}
    >
      {busy ? 'Please wait…' : children}
    </button>
  );
}
export function Field({ label, name, error, children, ...props }) {
  const id = props.id || name;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children || (
        <input
          {...props}
          name={name}
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      )}{' '}
      {error && (
        <small className="field-error" id={`${id}-error`}>
          {error}
        </small>
      )}
    </div>
  );
}
export function Select({ label, name, error, options, ...props }) {
  return (
    <Field label={label} name={name} error={error}>
      <select
        {...props}
        name={name}
        id={name}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
      >
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </Field>
  );
}
export const errorMessage = (e) =>
  e?.data?.error?.message || 'Unable to reach the server. Please try again.';
export const fieldErrors = (e) =>
  Object.fromEntries((e?.data?.error?.details || []).map((d) => [d.field, d.message]));
export function ErrorBox({ error, retry }) {
  return error ? (
    <div className="error-box" role="alert">
      <AlertCircle size={18} />
      <span>{errorMessage(error)}</span>
      {retry && <button onClick={() => retry()}>Try again</button>}
    </div>
  ) : null;
}
export function AsyncState({ loading, error, empty, retry, children }) {
  if (loading)
    return (
      <div className="loading" role="status">
        <span className="spinner" />
        Loading opportunities…
      </div>
    );
  if (error) return <ErrorBox error={error} retry={retry} />;
  if (empty)
    return (
      <div className="empty">
        <BriefcaseBusiness size={32} />
        <h3>Nothing here yet</h3>
        <p>Try different filters or check back for new opportunities.</p>
      </div>
    );
  return children;
}
export function Pagination({ meta, onChange }) {
  if (!meta || meta.totalPages < 2) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <Button variant="secondary" disabled={meta.page <= 1} onClick={() => onChange(meta.page - 1)}>
        Previous
      </Button>
      <span>
        Page {meta.page} of {meta.totalPages}
      </span>
      <Button
        variant="secondary"
        disabled={meta.page >= meta.totalPages}
        onClick={() => onChange(meta.page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}
export const human = (s) => (s || '').replaceAll('_', ' ');
export const salary = (j) =>
  j.salaryMinAnnualInr === null
    ? 'Salary not disclosed'
    : `₹${(j.salaryMinAnnualInr / 100000).toLocaleString('en-IN', { maximumFractionDigits: 2 })}–${(j.salaryMaxAnnualInr / 100000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} LPA`;
export function JobCard({ job }) {
  return (
    <article className="job-card">
      <div className="card-top">
        <span className="company-mark" aria-hidden="true">
          {job.companyName.slice(0, 2).toUpperCase()}
        </span>
        {job.isFeatured && <span className="badge accent">Featured</span>}
      </div>
      <p className="eyebrow">{job.companyName}</p>
      <h3>
        <Link to={`/jobs/${job.id}`}>{job.title}</Link>
      </h3>
      <div className="job-meta">
        <span>
          <MapPin size={14} />
          {job.locationCity || 'Anywhere'} · {job.workModeName || human(job.workMode)}
        </span>
        <span>
          <Clock3 size={14} />
          {job.employmentTypeName || human(job.employmentType)} ·{' '}
          {job.experienceLevelName || human(job.experienceLevel)}
        </span>
      </div>
      <div className="tags">
        {job.skills.slice(0, 3).map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>
      <div className="card-bottom">
        <strong>{salary(job)}</strong>
        <Link to={`/jobs/${job.id}`} aria-label={`View ${job.title}`}>
          <ArrowRight size={20} />
        </Link>
      </div>
    </article>
  );
}
const ToastContext = createContext(null);
export function ToastProvider({ children }) {
  const [message, setMessage] = useState('');
  return (
    <ToastContext.Provider value={setMessage}>
      {children}
      {message && (
        <div className="toast" role="status">
          {message}
          <button aria-label="Dismiss notification" onClick={() => setMessage('')}>
            ×
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
export function ConfirmDialog({ title, onConfirm, onCancel, busy }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      className="dialog"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <h2 id="confirm-title">{title}</h2>
      <p>The job will disappear from public listings. Existing applications will be retained.</p>
      <div className="actions">
        <Button autoFocus variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button variant="danger" busy={busy} onClick={onConfirm}>
          Delete job
        </Button>
      </div>
    </dialog>
  );
}
