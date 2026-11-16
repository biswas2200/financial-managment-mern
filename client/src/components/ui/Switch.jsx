import clsx from 'clsx';

/** An on/off control. `label` is what it is called for people using a screen reader. */
export function Switch({ checked, onChange, label, disabled = false, className }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-60',
        checked ? 'bg-brand' : 'bg-line-strong',
        className,
      )}
    >
      <span aria-hidden className={clsx('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200', checked ? 'translate-x-[1.375rem]' : 'translate-x-0.5')} />
    </button>
  );
}
