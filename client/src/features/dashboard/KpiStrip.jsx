import clsx from 'clsx';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { moneyWhole, percent } from '../../lib/format.js';
import { Sparkline } from '../../components/charts/Sparkline.jsx';

function Delta({ id, value, goodWhenUp, windowLabel }) {
  if (value === null || value === undefined) return null;
  const tone = value === 0 ? 'neutral' : (value > 0) === goodWhenUp ? 'positive' : 'negative';
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <p
      data-testid={id}
      data-tone={tone}
      className={clsx(
        'flex flex-wrap items-center gap-x-1 text-[0.8125rem]',
        tone === 'positive' && 'text-good-text',
        tone === 'negative' && 'text-bad-text',
        tone === 'neutral' && 'text-ink-2',
      )}
    >
      <Icon size={14} aria-hidden className="shrink-0" />
      <span className="font-semibold">{percent(Math.abs(value))}</span>
      <span className="text-ink-3">{windowLabel}</span>
    </p>
  );
}

/**
 * The month's headline numbers as one ruled strip (not four separate cards).
 * Rising spending is shown as bad; rising income and savings as good.
 */
export function KpiStrip({ summary, trend }) {
  const windowLabel =
    summary.period?.label === 'custom'
      ? 'vs previous period'
      : summary.period?.partial
        ? 'vs same days last month'
        : 'vs previous month';

  const cells = [
    { key: 'income', label: 'Income', value: moneyWhole(summary.income), delta: summary.change?.income, goodWhenUp: true, spark: trend?.map((t) => t.income), color: 'var(--income)' },
    { key: 'expense', label: 'Spent', value: moneyWhole(summary.expense), delta: summary.change?.expense, goodWhenUp: false, spark: trend?.map((t) => t.expense), color: 'var(--expense)' },
    { key: 'net', label: summary.net >= 0 ? 'Saved' : 'Overspent', value: moneyWhole(Math.abs(summary.net)), delta: summary.change?.net, goodWhenUp: true },
    {
      key: 'rate',
      label: 'Savings rate',
      value: summary.savingsRate === null || summary.savingsRate === undefined ? 'n/a' : `${summary.savingsRate}%`,
      note: summary.savingsRate === null ? 'No income recorded' : 'Share of income kept',
    },
  ];

  return (
    <section
      aria-label="This period at a glance"
      className="grid grid-cols-2 overflow-hidden rounded-2xl bg-surface ring-1 ring-line lg:grid-cols-4"
    >
      {cells.map((cell, i) => (
        <div
          key={cell.key}
          data-testid={`kpi-${cell.key}`}
          className={clsx(
            'flex min-w-0 flex-col gap-1.5 p-4 sm:p-5',
            i % 2 === 1 && 'border-l border-line',
            i >= 2 && 'border-t border-line lg:border-t-0',
            i === 2 && 'lg:border-l',
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-ink-2">{cell.label}</h3>
            {cell.spark && <Sparkline values={cell.spark} color={cell.color} width={72} height={22} className="hidden sm:block" />}
          </div>
          <p className="font-condensed text-[1.75rem] leading-tight font-semibold text-ink sm:text-[2rem]">{cell.value}</p>
          {cell.delta !== undefined ? (
            <Delta id={`kpi-${cell.key}-delta`} value={cell.delta} goodWhenUp={cell.goodWhenUp} windowLabel={windowLabel} />
          ) : (
            <p className="text-[0.8125rem] text-ink-3">{cell.note}</p>
          )}
        </div>
      ))}
    </section>
  );
}
