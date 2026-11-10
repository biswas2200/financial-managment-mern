import { ChevronLeft, ChevronRight } from 'lucide-react';
import { shiftMonth, currentMonthKey, formatMonthLabel } from '@kosha/shared';
import { Button } from './primitives.jsx';

/** ‹ November 2026 ›: steps through months, never past the current one. */
export function MonthPicker({ value, onChange, min }) {
  const isCurrent = value >= currentMonthKey();
  const atMin = min ? value <= min : false;
  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-surface p-1 ring-1 ring-line" role="group" aria-label="Choose month">
      <Button variant="ghost" size="icon" aria-label="Previous month" disabled={atMin} onClick={() => onChange(shiftMonth(value, -1))}>
        <ChevronLeft size={18} />
      </Button>
      <span className="min-w-[8.5rem] text-center text-[0.9375rem] font-semibold" aria-live="polite">
        {formatMonthLabel(value)}
      </span>
      <Button variant="ghost" size="icon" aria-label="Next month" disabled={isCurrent} onClick={() => onChange(shiftMonth(value, 1))}>
        <ChevronRight size={18} />
      </Button>
    </div>
  );
}
