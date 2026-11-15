import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { shiftMonth, currentMonthKey, formatMonthLabel } from '@kosha/shared';
import { Button } from './primitives.jsx';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Twelve months of one year; the ones that have not happened (or are before `min`) cannot be chosen. */
function MonthGrid({ value, min, onPick, onClose }) {
  const now = currentMonthKey();
  const [year, setYear] = useState(Number(value.slice(0, 4)));
  const ref = useRef(null);
  const firstYear = min ? Number(min.slice(0, 4)) : -Infinity;
  const lastYear = Number(now.slice(0, 4));

  // Mount once: focus the month you are on, and close on Escape or a click outside. `onClose` is read through
  // a ref so a re-render (changing the year) does not move focus or re-subscribe.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    ref.current?.querySelector('[aria-current="date"], button:not(:disabled)')?.focus();
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onCloseRef.current(true);
    };
    const onPointer = (e) => {
      if (!ref.current?.parentElement?.contains(e.target)) onCloseRef.current(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, []);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Pick a month"
      className="pop-in raised absolute top-full left-1/2 z-40 mt-2 w-64 -translate-x-1/2 rounded-2xl bg-surface p-3 shadow-raise-2 max-sm:left-0 max-sm:translate-x-0"
    >
      <div className="mb-2 flex items-center justify-between">
        <Button variant="ghost" size="icon" aria-label="Previous year" disabled={year <= firstYear} onClick={() => setYear((y) => y - 1)}>
          <ChevronLeft size={18} />
        </Button>
        <span key={year} className="pop-in font-wide text-[0.9375rem] font-semibold tabular">
          {year}
        </span>
        <Button variant="ghost" size="icon" aria-label="Next year" disabled={year >= lastYear} onClick={() => setYear((y) => y + 1)}>
          <ChevronRight size={18} />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {MONTH_NAMES.map((name, i) => {
          const key = `${year}-${String(i + 1).padStart(2, '0')}`;
          const unavailable = key > now || (min ? key < min : false);
          const selected = key === value;
          return (
            <button
              key={key}
              type="button"
              disabled={unavailable}
              aria-label={formatMonthLabel(key)}
              aria-current={selected ? 'date' : undefined}
              onClick={() => onPick(key)}
              className={clsx(
                'h-10 rounded-lg text-sm font-medium transition-[background-color,color,transform] duration-150 active:scale-95',
                selected ? 'bg-brand text-brand-ink shadow-raise-1' : 'text-ink hover:bg-surface-2',
                key === now && !selected && 'ring-1 ring-brand/50',
                unavailable && 'cursor-not-allowed text-ink-3 opacity-40 hover:bg-transparent',
              )}
            >
              {name}
            </button>
          );
        })}
      </div>
      {value !== now && (
        <button type="button" onClick={() => onPick(now)} className="mt-2 w-full rounded-lg py-2 text-sm font-semibold text-brand hover:bg-surface-2">
          Jump to this month
        </button>
      )}
    </div>
  );
}

/**
 * ‹ November 2026 ›: the arrows step one month; clicking the name opens a grid to jump to any
 * month, never past the current one and never before `min`.
 */
export function MonthPicker({ value, onChange, min }) {
  const [open, setOpen] = useState(false);
  const labelRef = useRef(null);
  const isCurrent = value >= currentMonthKey();
  const atMin = min ? value <= min : false;

  const close = (refocus) => {
    setOpen(false);
    if (refocus) labelRef.current?.focus();
  };

  return (
    <div className="relative max-sm:w-full sm:inline-flex">
      <div className="flex w-full items-center gap-1 rounded-xl raised bg-surface p-1 shadow-raise-1 sm:inline-flex sm:w-auto" role="group" aria-label="Choose month">
        <Button variant="ghost" size="icon" aria-label="Previous month" disabled={atMin} onClick={() => onChange(shiftMonth(value, -1))}>
          <ChevronLeft size={18} />
        </Button>
        <button
          ref={labelRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-[8.5rem] flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[0.9375rem] font-semibold transition-colors hover:bg-surface-2 sm:flex-none"
        >
          <span aria-live="polite">{formatMonthLabel(value)}</span>
          <ChevronDown size={14} aria-hidden className={clsx('text-ink-3 transition-transform duration-200', open && 'rotate-180')} />
        </button>
        <Button variant="ghost" size="icon" aria-label="Next month" disabled={isCurrent} onClick={() => onChange(shiftMonth(value, 1))}>
          <ChevronRight size={18} />
        </Button>
      </div>
      {open && (
        <MonthGrid
          value={value}
          min={min}
          onClose={close}
          onPick={(key) => {
            close(true);
            onChange(key);
          }}
        />
      )}
    </div>
  );
}
