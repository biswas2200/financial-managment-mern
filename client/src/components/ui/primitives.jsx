import { forwardRef, useEffect, useId, useRef } from 'react';
import clsx from 'clsx';
import { Loader, X } from 'lucide-react';

// ---------- Button ----------

const BUTTON_VARIANTS = {
  primary: 'bg-brand text-brand-ink hover:bg-brand-hover',
  secondary: 'bg-surface text-ink ring-1 ring-inset ring-line-strong hover:bg-surface-2',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  danger: 'bg-bad text-white hover:brightness-95',
};
const BUTTON_SIZES = {
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-[0.9375rem] gap-2 rounded-[10px]',
  lg: 'h-12 px-5 text-base gap-2 rounded-xl',
  icon: 'h-9 w-9 rounded-lg justify-center',
};

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, className, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-55',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

// ---------- Form controls ----------

const controlBase =
  'w-full rounded-[10px] bg-surface px-3 text-[0.9375rem] text-ink ring-1 ring-inset ring-line-strong placeholder:text-ink-3 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand aria-[invalid=true]:ring-bad';

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={clsx(controlBase, 'h-10', className)} {...props} />;
});

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={clsx(controlBase, 'h-10 cursor-pointer pr-8', className)} {...props}>
      {children}
    </select>
  );
});

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={clsx(controlBase, 'min-h-20 py-2', className)} {...props} />;
});

/** Label + control + hint/error, wired with ids for screen readers. */
export function Field({ label, error, hint, children, className, optional }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink-2">
        {label}
        {optional && <span className="font-normal text-ink-3"> (optional)</span>}
      </label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}
      {error ? (
        <p id={`${id}-error`} className="text-[0.8125rem] text-bad-text">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[0.8125rem] text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Radio-group styled as a segmented control. */
export function Segmented({ value, onChange, options, label, size = 'md', className }) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} className={clsx('inline-flex rounded-[10px] bg-surface-2 p-1', className)}>
      {options.map((opt) => {
        const checked = opt.value === value;
        return (
          <label
            key={opt.value}
            className={clsx(
              'relative flex cursor-pointer items-center gap-1.5 rounded-lg font-medium transition-colors',
              size === 'sm' ? 'px-2.5 py-1 text-sm' : 'px-3.5 py-1.5 text-[0.9375rem]',
              checked ? 'bg-surface text-ink shadow-sm ring-1 ring-line' : 'text-ink-2 hover:text-ink',
            )}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={checked}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            {opt.icon}
            {opt.label}
          </label>
        );
      })}
    </div>
  );
}

// ---------- Dialog (native <dialog>: focus trap + Esc for free) ----------

export function Dialog({ open, onClose, title, description, children, size = 'md' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="dialog-title"
      className={clsx(
        'm-auto w-[calc(100%-2rem)] rounded-2xl bg-surface p-0 text-ink shadow-[var(--shadow-pop)] ring-1 ring-line',
        size === 'lg' ? 'max-w-2xl' : 'max-w-lg',
      )}
    >
      {open && (
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 id="dialog-title" className="font-wide text-xl font-semibold">
                {title}
              </h2>
              {description && <p className="mt-1 text-sm text-ink-2">{description}</p>}
            </div>
            <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
              <X size={18} />
            </Button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

// ---------- Feedback ----------

export function Skeleton({ className }) {
  return <div className={clsx('animate-pulse rounded-lg bg-surface-2', className)} aria-hidden />;
}

export function EmptyState({ icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      {icon && <div className="mb-1 rounded-full bg-surface-2 p-3 text-ink-2">{icon}</div>}
      <p className="font-semibold text-ink">{title}</p>
      {children && <p className="max-w-sm text-sm text-ink-2">{children}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorNote({ error, onRetry }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-bad/8 px-4 py-3 text-sm text-bad-text ring-1 ring-bad/25">
      <span>{error?.message ?? 'Something went wrong while loading this.'}</span>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
