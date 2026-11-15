import { Plus } from 'lucide-react';
import { useTransactions } from '../../api/hooks.js';
import { Button, Skeleton } from '../../components/ui/primitives.jsx';
import { dateShort, dayHeader, money } from '../../lib/format.js';
import { TransactionRow } from '../transactions/TransactionRow.jsx';

/**
 * What happened on one day: the transactions themselves, their total, and a way to add another
 * (the add form starts on that day, so earlier days can be filled in).
 */
export function DayDetail({ day, onAdd, onEdit }) {
  const { data, isLoading } = useTransactions({ from: day, to: day, sort: '-date', limit: 50, page: 1 });
  const summary = data?.summary;

  return (
    <section aria-label={`Spending on ${dayHeader(day)}`} className="page-in mt-4 rounded-xl bg-surface-2 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-wide text-[0.9375rem] font-semibold">{dayHeader(day)}</h3>
        {summary && (summary.expense > 0 || summary.income > 0) && (
          <p className="text-sm text-ink-2 tabular">
            {summary.expense > 0 && <span className="font-semibold text-ink">{money(summary.expense)} spent</span>}
            {summary.expense > 0 && summary.income > 0 && ', '}
            {summary.income > 0 && <span className="font-semibold text-income-text">{money(summary.income)} received</span>}
          </p>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="mt-3 h-14" />
      ) : data.items.length ? (
        <div className="mt-1 divide-y divide-line/70">
          {data.items.map((t) => (
            <TransactionRow key={t.id} txn={t} showDate={false} onClick={() => onEdit(t)} />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-ink-2">Nothing recorded for {dateShort(day)}.</p>
      )}

      <Button variant="secondary" size="sm" className="mt-3" onClick={() => onAdd(day)}>
        <Plus size={16} aria-hidden />
        Add expense for {dateShort(day)}
      </Button>
    </section>
  );
}
