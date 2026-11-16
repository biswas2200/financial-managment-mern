import clsx from 'clsx';

/**
 * The logo's colours are fixed, not theme tokens: a near-black tile with an indigo note, a marigold security thread and
 * a pale rosette. That makes it identical in light mode, dark mode, the sidebar, the favicon and the app icons.
 * public/favicon.svg and public/icons are drawn from the same values (run `npm run icons -w client` to redraw them).
 */
export const LOGO_COLORS = { tile: '#0b0e1c', note: '#3b4cc2', thread: '#e2a93a', rosette: '#dfeee9' };

/** The Kosha mark: a folded note with its security thread, on a black tile. */
export function LogoMark({ size = 28, className }) {
  const { tile, note, thread, rosette } = LOGO_COLORS;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="15" fill={tile} />
      <rect x="9" y="18" width="46" height="28" rx="7" fill={note} />
      <rect x="38" y="18" width="4" height="28" fill={thread} />
      <g fill="none" stroke={rosette} strokeWidth="1.3" opacity=".92">
        <circle cx="24" cy="32" r="8" />
        <circle cx="24" cy="32" r="4.6" />
        <path d="M16 32c2.7-4.4 5.6-4.4 8 0s5.6 4.4 8 0" />
      </g>
    </svg>
  );
}

export function Logo({ className, size = 28, textClassName = 'text-ink' }) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      <span className={`font-extrawide text-[1.375rem] leading-none font-bold tracking-[-0.01em] ${textClassName}`}>Kosha</span>
    </span>
  );
}
