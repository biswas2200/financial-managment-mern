import clsx from 'clsx';

/** A keyboard key, as in "Press N to add an expense". */
export const Kbd = ({ children, className, inverse = false, plain = false }) => (
  <kbd
    className={clsx(
      'inline-flex min-w-6 items-center justify-center rounded-md px-1.5 py-0.5 font-sans text-[0.75rem] font-semibold ring-1',
      !plain && (inverse ? 'bg-white/20 text-brand-ink ring-white/30' : 'bg-surface-2 text-ink-2 ring-line-strong'),
      className,
    )}
  >
    {children}
  </kbd>
);
