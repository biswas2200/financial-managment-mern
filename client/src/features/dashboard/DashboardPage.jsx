import { useState } from 'react';
import { Link } from 'react-router-dom';
import { currentMonthKey, formatMonthLabel } from '@kosha/shared';
import { Receipt, PiggyBank } from 'lucide-react';
import { useSummary, useTrend, useByCategory, useDaily, useBudgets, useTransactions } from '../../api/hooks.js';
import { PageHeader, useQuickAdd } from '../../components/layout/AppShell.jsx';
import { MonthPicker } from '../../components/ui/MonthPicker.jsx';
import { Panel } from '../../components/ui/Panel.jsx';
import { Skeleton, EmptyState, ErrorNote, Button } from '../../components/ui/primitives.jsx';
import { CategoryIcon } from '../../components/ui/CategoryIcon.jsx';
import { CashFlowChart } from '../../components/charts/CashFlowChart.jsx';
import { CategoryBars } from '../../components/charts/CategoryBars.jsx';
import { SpendingCalendar } from '../../components/charts/SpendingCalendar.jsx';
import { BudgetMeter } from '../../components/charts/BudgetMeter.jsx';
import { useCurrentUser } from '../../app/auth.jsx';
import { money, moneyWhole, greeting, percent } from '../../lib/format.js';
import { BalanceNote } from './BalanceNote.jsx';
import { KpiStrip } from './KpiStrip.jsx';
import { Insights } from './Insights.jsx';
import { TransactionRow } from '../transactions/TransactionRow.jsx';

export default function DashboardPage() {
  const user = useCurrentUser();
  const [month, setMonth] = useState(currentMonthKey());
  const { openAdd, openEdit } = useQuickAdd();

  const summary = useSummary({ month });
  const trend = useTrend({ months: 12, end: month });
  const byCategory = useByCategory({ month, type: 'expense' });
  const daily = useDaily({ month });
  const budgets = useBudgets(month);
  const recent = useTransactions({ limit: 6, sort: '-date', page: 1 });

  const label = formatMonthLabel(month);
  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description={`Here's how ${label} is going.`}
        actions={<MonthPicker value={month} onChange={setMonth} />}
      />

      {summary.isError && <ErrorNote error={summary.error} onRetry={summary.refetch} />}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        {summary.data ? (
          <BalanceNote balance={summary.data.balance} net={summary.data.net} monthLabel={label} partial={summary.data.period.partial} />
        ) : (
          <Skeleton className="h-60 rounded-[22px]" />
        )}
        <Insights />
      </div>

      <div className="mt-5">
        {summary.data ? <KpiStrip summary={summary.data} trend={trend.data?.slice(-6)} /> : <Skeleton className="h-32 rounded-2xl" />}
      </div>

      <Panel
        className="mt-5"
        title="Income and spending"
        subtitle="Last 12 months"
        table={
          trend.data && {
            caption: 'Monthly income and spending',
            columns: [
              { key: 'month', label: 'Month' },
              { key: 'income', label: 'Income', align: 'right' },
              { key: 'expense', label: 'Spent', align: 'right' },
              { key: 'net', label: 'Saved', align: 'right' },
            ],
            rows: trend.data.map((t) => ({
              key: t.month,
              month: formatMonthLabel(t.month),
              income: money(t.income),
              expense: money(t.expense),
              net: money(t.net),
            })),
          }
        }
      >
        {trend.data ? <CashFlowChart data={trend.data} selectedMonth={month} /> : <Skeleton className="h-64" />}
      </Panel>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel
          title="Where it went"
          subtitle={byCategory.data ? `${moneyWhole(byCategory.data.total)} spent in ${label}` : label}
          table={
            byCategory.data && {
              caption: 'Spending by category',
              columns: [
                { key: 'name', label: 'Category' },
                { key: 'count', label: 'Transactions', align: 'right' },
                { key: 'total', label: 'Spent', align: 'right' },
                { key: 'share', label: 'Share', align: 'right' },
              ],
              rows: byCategory.data.items.map((i) => ({ key: i.categoryId, name: i.name, count: i.count, total: money(i.total), share: percent(i.share) })),
            }
          }
        >
          {!byCategory.data ? (
            <Skeleton className="h-64" />
          ) : byCategory.data.items.length ? (
            <CategoryBars items={byCategory.data.items} />
          ) : (
            <EmptyState icon={<Receipt size={20} />} title="No spending yet" action={<Button onClick={openAdd}>Add a transaction</Button>}>
              Expenses you log for {label} will be ranked here.
            </EmptyState>
          )}
        </Panel>

        <Panel title="Daily spending" subtitle="Darker days cost more">
          {daily.data ? <SpendingCalendar days={daily.data} /> : <Skeleton className="h-64" />}
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel
          title="Budgets"
          subtitle={budgets.data?.items.length ? `${moneyWhole(budgets.data.totals.spent)} of ${moneyWhole(budgets.data.totals.limit)} used` : label}
          actions={
            <Link to="/budgets" className="text-sm font-semibold text-brand hover:underline">
              Manage
            </Link>
          }
        >
          {!budgets.data ? (
            <Skeleton className="h-56" />
          ) : budgets.data.items.length ? (
            <ul className="flex flex-col gap-4">
              {budgets.data.items.slice(0, 5).map((b) => (
                <li key={b.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
                  <CategoryIcon icon={b.category.icon} color={b.category.color} size="sm" />
                  <div className="min-w-0">
                    <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{b.category.name}</span>
                      <span className="text-ink-2 tabular">
                        <span className="font-semibold text-ink">{moneyWhole(b.spent)}</span> / {moneyWhole(b.limit)}
                      </span>
                    </div>
                    <BudgetMeter spent={b.spent} limit={b.limit} status={b.status} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<PiggyBank size={20} />}
              title={`No budgets for ${label}`}
              action={
                <Link to="/budgets" className="text-sm font-semibold text-brand hover:underline">
                  Set a budget
                </Link>
              }
            >
              Give your biggest categories a monthly limit and track them here.
            </EmptyState>
          )}
        </Panel>

        <Panel
          title="Recent activity"
          actions={
            <Link to="/transactions" className="text-sm font-semibold text-brand hover:underline">
              See all
            </Link>
          }
        >
          {!recent.data ? (
            <Skeleton className="h-56" />
          ) : recent.data.items.length ? (
            <div className="divide-y divide-line/70">
              {recent.data.items.map((t) => (
                <TransactionRow key={t.id} txn={t} onClick={() => openEdit(t)} />
              ))}
            </div>
          ) : (
            <EmptyState icon={<Receipt size={20} />} title="Nothing logged yet" action={<Button onClick={openAdd}>Add your first transaction</Button>}>
              Your latest income and expenses will appear here.
            </EmptyState>
          )}
        </Panel>
      </div>
    </>
  );
}
