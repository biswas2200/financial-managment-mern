import { forwardRef, useEffect, useId, useRef } from 'react';
import clsx from 'clsx';
import { Check, Loader, X } from 'lucide-react';

// ---------- Button ----------

const BUTTON_VARIANTS = {
  primary: 'btn-3d bg-brand text-brand-ink hover:bg-brand-hover',
  secondary: 'btn-3d-soft bg-surface text-ink hover:bg-surface-2',
  ghost: 'text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink active:scale-95',
  danger: 'btn-3d bg-bad text-white hover:brightness-95',
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
        'inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-55',
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

// `control` (styles/index.css) draws the inset well and animates the focus ring and halo.
const controlBase = 'control w-full rounded-[10px] bg-surface px-3 text-[0.9375rem] text-ink placeholder:text-ink-3';

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={clsx(controlBase, 'h-10', className)} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={clsx(controlBase, 'min-h-20 py-2', className)} {...props} />;
});

/**
 * A checkbox with a drawn tick that pops in. The input itself is the box (so it is a real click target),
 * and the label text, with any links in it, is its accessible name.
 */
export const Checkbox = forwardRef(function Checkbox({ children, className, error, ...props }, ref) {
  return (
    <label className={clsx('flex cursor-pointer items-start gap-3 text-sm text-ink-2', className)}>
      <span className="relative mt-0.5 h-5 w-5 shrink-0">
        <input
          ref={ref}
          type="checkbox"
          aria-invalid={Boolean(error)}
          className={clsx(
            'peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-md bg-surface shadow-inset transition-[background-color,box-shadow,transform] duration-200',
            'checked:bg-brand checked:shadow-none active:scale-90 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
            error && 'ring-2 ring-bad',
          )}
          {...props}
        />
        <Check
          size={14}
          strokeWidth={3}
          aria-hidden
          className="pointer-events-none absolute inset-0 m-auto scale-0 text-brand-ink transition-transform duration-200 peer-checked:scale-100"
        />
      </span>
      <span className="min-w-0 leading-snug">{children}</span>
    </label>
  );
});

/** Label + control + hint/error, wired with ids for screen readers. */
export function Field({ label, error, hint, children, className, optional }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={clsx('group flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink-2 transition-colors duration-300 group-focus-within:text-brand">
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
    <div role="radiogroup" aria-label={label} className={clsx('inline-flex rounded-[10px] bg-surface-2 p-1 shadow-inset', className)}>
      {options.map((opt) => {
        const checked = opt.value === value;
        return (
          <label
            key={opt.value}
            className={clsx(
              'relative flex cursor-pointer items-center gap-1.5 rounded-lg font-medium transition-colors',
              size === 'sm' ? 'px-2.5 py-1 text-sm' : 'px-3.5 py-1.5 text-[0.9375rem]',
              checked ? 'raised bg-surface text-ink shadow-raise-1' : 'text-ink-2 hover:text-ink',
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
  const titleId = useId(); // unique, so a dialog opened from inside another still has the right name

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      // React bubbles a nested dialog's close/cancel up to the dialog around it, so only react to our own.
      onClose={(e) => e.target === ref.current && onClose()}
      onCancel={(e) => {
        e.preventDefault();
        if (e.target === ref.current) onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby={titleId}
      className={clsx(
        'raised m-auto w-[calc(100%-2rem)] rounded-2xl bg-surface p-0 text-ink shadow-raise-2',
        size === 'lg' ? 'max-w-2xl' : 'max-w-lg',
      )}
    >
      {open && (
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="font-wide text-xl font-semibold">
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
      {icon && <div className="mb-1 rounded-2xl bg-surface p-3 text-brand shadow-raise-1 raised">{icon}</div>}
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
