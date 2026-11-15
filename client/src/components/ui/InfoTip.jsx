import { useEffect, useId, useState } from 'react';
import clsx from 'clsx';
import { CircleHelp } from 'lucide-react';

/**
 * A small "?" next to a term. Hover or keyboard focus shows a plain-language
 * explanation; Escape hides it. The explanation is linked with aria-describedby.
 */
export function InfoTip({ label, children, align = 'center', className }) {
  const id = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <span className={clsx('relative inline-flex align-middle', className)}>
      <button
        type="button"
        aria-label={`What is ${label}?`}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-ink-3 hover:text-ink focus-visible:text-ink"
      >
        <CircleHelp size={14} aria-hidden />
      </button>
      {open && (
        <span
          role="tooltip"
          id={id}
          className={clsx(
            'absolute top-full z-40 mt-1.5 w-60 rounded-lg bg-ink px-3 py-2 text-left text-[0.8125rem] leading-snug font-normal text-paper shadow-[var(--shadow-pop)]',
            align === 'start' ? 'left-0' : align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2',
          )}
        >
          {children}
        </span>
      )}
    </span>
  );
}
