import clsx from 'clsx';
import { TriangleAlert, CircleAlert } from 'lucide-react';

const STATUS = {
  ok: { fill: 'var(--brand)', label: null },
  warning: { fill: 'var(--warn)', label: 'Close to limit', Icon: TriangleAlert, text: 'text-warn-text' },
  over: { fill: 'var(--bad)', label: 'Over budget', Icon: CircleAlert, text: 'text-bad-text' },
};

/** Spent vs limit. Status colours always come with an icon and a label. */
export function BudgetMeter({ spent, limit, status = 'ok', className, showLabel = true }) {
  const pct = limit ? (spent / limit) * 100 : 0;
  const s = STATUS[status] ?? STATUS.ok;
  return (
    <div className={className}>
      <div
        className="relative h-2.5 overflow-hidden rounded-full bg-surface-2"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label="Share of budget used"
      >
        <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: s.fill }} />
      </div>
      {showLabel && s.label && (
        <p className={clsx('mt-1.5 flex items-center gap-1 text-[0.8125rem] font-medium', s.text)}>
          <s.Icon size={14} aria-hidden />
          {s.label}
        </p>
      )}
    </div>
  );
}
