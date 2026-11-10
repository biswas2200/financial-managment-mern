import clsx from 'clsx';

/** The Kosha mark: a folded note with its security thread. */
export function LogoMark({ size = 28, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <rect x="4" y="12" width="56" height="40" rx="9" fill="var(--brand)" />
      <rect x="40" y="12" width="5" height="40" fill="var(--thread)" />
      <g fill="none" stroke="var(--note)" strokeWidth="1.8" opacity=".95">
        <circle cx="23" cy="32" r="11" />
        <circle cx="23" cy="32" r="6.5" />
        <path d="M12 32c3.5-6 7.5-6 11 0s7.5 6 11 0" />
      </g>
    </svg>
  );
}

export function Logo({ className, size = 28 }) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      <span className="font-extrawide text-[1.375rem] leading-none font-bold tracking-[-0.01em] text-ink">Kosha</span>
    </span>
  );
}
