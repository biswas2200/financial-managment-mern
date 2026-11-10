import clsx from 'clsx';
import { CategoryIcon } from '../../components/ui/CategoryIcon.jsx';
import { money, dateShort } from '../../lib/format.js';

export function Amount({ txn, className }) {
  const income = txn.type === 'income';
  return (
    <span className={clsx('font-semibold whitespace-nowrap tabular', income ? 'text-income-text' : 'text-ink', className)}>
      {income ? '+' : '−'}
      {money(txn.amount)}
    </span>
  );
}

/** Compact row used in lists (recent activity, Copilot results). */
export function TransactionRow({ txn, showDate = true, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={clsx(
        'flex w-full items-center gap-3 py-2.5 text-left',
        onClick && '-mx-2 rounded-lg px-2 hover:bg-surface-2',
      )}
    >
      <CategoryIcon icon={txn.category?.icon} color={txn.category?.color} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] font-medium">{txn.description}</span>
        <span className="block truncate text-[0.8125rem] text-ink-3">
          {[txn.merchant, txn.category?.name].filter(Boolean).join(', ')}
        </span>
      </span>
      <span className="flex flex-col items-end">
        <Amount txn={txn} className="text-[0.9375rem]" />
        {showDate && <span className="text-[0.8125rem] text-ink-3">{dateShort(txn.date)}</span>}
      </span>
    </Tag>
  );
}
