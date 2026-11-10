import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { toDayKey } from '@kosha/shared';
import { money, dayHeader } from '../../lib/format.js';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// One-hue sequential ramp: the expense hue mixed toward the surface. More = stronger.
const LEVELS = [0, 22, 44, 68, 100];

function levelFor(value, max) {
  if (!value) return 0;
  return Math.min(4, Math.max(1, Math.ceil((value / max) * 4)));
}

const cellColor = (level) =>
  level === 0 ? 'var(--surface-2)' : `color-mix(in oklch, var(--expense) ${LEVELS[level]}%, var(--surface))`;

/** Calendar heatmap of daily spending for one month. */
export function SpendingCalendar({ days = [] }) {
  const today = toDayKey(new Date());
  const max = Math.max(...days.map((d) => d.expense), 1);
  const peak = useMemo(() => days.reduce((a, b) => (b.expense > (a?.expense ?? 0) ? b : a), null), [days]);
  const [focus, setFocus] = useState(null);
  const shown = focus ?? peak;

  if (!days.length) return null;
  const firstWeekday = (new Date(`${days[0].date}T12:00:00+05:30`).getUTCDay() + 6) % 7; // Monday = 0

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-[0.75rem] text-ink-3" aria-hidden>
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1.5" role="grid" aria-label="Daily spending this month">
        {Array.from({ length: firstWeekday }, (_, i) => (
          <span key={`pad-${i}`} aria-hidden />
        ))}
        {days.map((d) => {
          const level = levelFor(d.expense, max);
          const future = d.date > today;
          return (
            <button
              key={d.date}
              type="button"
              role="gridcell"
              disabled={future}
              onMouseEnter={() => setFocus(d)}
              onFocus={() => setFocus(d)}
              onMouseLeave={() => setFocus(null)}
              onBlur={() => setFocus(null)}
              aria-label={`${dayHeader(d.date)}: ${d.expense ? money(d.expense) : 'no spending'}`}
              className={clsx(
                'relative h-10 rounded-md text-[0.75rem] font-medium transition-[box-shadow] sm:h-11',
                future ? 'cursor-default opacity-35' : 'hover:ring-2 hover:ring-ink/30',
                d.date === today && 'ring-2 ring-brand',
                level >= 3 ? 'text-white' : 'text-ink-2',
              )}
              style={{ background: future ? 'transparent' : cellColor(level) }}
            >
              {Number(d.date.slice(-2))}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="min-h-5 text-sm text-ink-2" aria-live="polite">
          {shown && shown.expense > 0 ? (
            <>
              <span className="font-semibold text-ink">{dayHeader(shown.date)}</span>: {money(shown.expense)} across {shown.count}{' '}
              {shown.count === 1 ? 'transaction' : 'transactions'}
              {!focus && ' (biggest day)'}
            </>
          ) : (
            'No spending recorded yet.'
          )}
        </p>
        <span className="flex items-center gap-1 text-[0.75rem] text-ink-3" aria-hidden>
          Less
          {LEVELS.map((_, i) => (
            <span key={i} className="h-3 w-3 rounded-[3px]" style={{ background: cellColor(i) }} />
          ))}
          More
        </span>
      </div>
    </div>
  );
}
