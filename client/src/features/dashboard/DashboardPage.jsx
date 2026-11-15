import { useState } from 'react';
import { Link } from 'react-router-dom';
import { currentMonthKey, firstTrackedMonth, formatMonthLabel, shiftMonth } from '@kosha/shared';
import { Receipt, PiggyBank, Plus, ArrowUpRight, CalendarClock } from 'lucide-react';
import { useSummary, useTrend, useByCategory, useDaily, useBudgets, useTransactions, useAssistantHistory } from '../../api/hooks.js';
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
import { GettingStarted } from './GettingStarted.jsx';
import { DayDetail } from './DayDetail.jsx';

/** Remembers per user whether the getting-started card was hidden. */
function useOnboardingHidden(userId) {
  const key = `kosha-onboarding-hidden:${userId}`;
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  });
  const hide = () => {
    setHidden(true);
    try {
      localStorage.setItem(key, '1');
    } catch {
      /* private mode: hidden for this visit only */
    }
  };
  return [hidden, hide];
}

export default function DashboardPage() {
  const user = useCurrentUser();
  const [month, setMonthKey] = useState(currentMonthKey());
  const [selectedDay, setSelectedDay] = useState(null); // 'YYYY-MM-DD' picked on the calendar
  const { openAdd, openEdit } = useQuickAdd();
  const setMonth = (key) => {
    setMonthKey(key);
    setSelectedDay(null);
  };

  const summary = useSummary({ month });
  const trend = useTrend({ months: 12, end: month });
  const byCategory = useByCategory({ month, type: 'expense' });
  const daily = useDaily({ month });
  const budgets = useBudgets(month);
  const recent = useTransactions({ limit: 6, sort: '-date', page: 1 });
  const oldest = useTransactions({ limit: 1, sort: 'date', page: 1 });

  // Months before the user's first record (or sign-up) have nothing to analyse: show the calendar only.
  const trackingStart = user && oldest.data ? firstTrackedMonth({ accountCreatedAt: user.createdAt, oldestTransactionDate: oldest.data.items[0]?.date }) : null;
  const beforeStart = Boolean(trackingStart) && month < trackingStart;

  // Data for the first-run checklist (tiny queries: one row each).
  const anyIncome = useTransactions({ type: 'income', limit: 1, page: 1, sort: '-date' });
  const anyExpense = useTransactions({ type: 'expense', limit: 1, page: 1, sort: '-date' });
  const thisMonthBudgets = useBudgets(currentMonthKey());
  const chat = useAssistantHistory();
  const [onboardingHidden, hideOnboarding] = useOnboardingHidden(user?.id);
  const onboardingReady = anyIncome.data && anyExpense.data && thisMonthBudgets.data && chat.data;

  const label = formatMonthLabel(month);
  const firstName = user?.name?.split(' ')[0] ?? '';

  const dailyPanel = (
    <Panel title="Daily spending" subtitle={beforeStart ? 'Pick a day to add what you spent' : 'Darker days cost more. Click a day to see it.'}>
      {daily.data ? <SpendingCalendar days={daily.data} selected={selectedDay} onSelect={setSelectedDay} /> : <Skeleton className="h-64" />}
      {selectedDay && <DayDetail key={selectedDay} day={selectedDay} onAdd={(date) => openAdd('expense', { date })} onEdit={openEdit} />}
    </Panel>
  );

  return (
    <div className="rise">
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description={`Here's how ${label} is going.`}
        actions={
          <>
            {/* On phones the header bar already has "Add expense"; keep this row uncluttered. */}
            <div className="hidden gap-2 sm:flex">
              <Button variant="secondary" onClick={() => openAdd('income')}>
                <ArrowUpRight size={17} aria-hidden />
                Add income
              </Button>
              <Button onClick={() => openAdd('expense')}>
                <Plus size={17} aria-hidden />
                Add expense
              </Button>
            </div>
            <MonthPicker value={month} onChange={setMonth} min={shiftMonth(currentMonthKey(), -60)} />
          </>
        }
      />

      {beforeStart ? (
        <>
          <section className="raised mb-5 flex items-start gap-4 rounded-2xl bg-surface p-5 shadow-raise-1">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <CalendarClock size={20} aria-hidden />
            </span>
            <div>
              <h2 className="font-wide text-[1.0625rem] font-semibold">{label} is before you started using Kosha</h2>
              <p className="mt-1 max-w-2xl text-sm text-ink-2">
                Your first record is in {formatMonthLabel(trackingStart)}, so there is nothing to analyse for this month. If you remember spending from then,
                pick a day below and add it. Once you do, this month gets its own figures and charts.
              </p>
            </div>
          </section>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">{dailyPanel}</div>
        </>
      ) : (
        <>
      {onboardingReady && !onboardingHidden && (
        <GettingStarted
          counts={{
            incomeCount: anyIncome.data.total,
            expenseCount: anyExpense.data.total,
            budgetCount: thisMonthBudgets.data.items.length,
            chatCount: chat.data.length,
          }}
          onAddIncome={() => openAdd('income')}
          onAddExpense={() => openAdd('expense')}
          onDismiss={hideOnboarding}
        />
      )}

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
        subtitle="Last 12 months. Click a month to open it."
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
        {trend.data ? <CashFlowChart data={trend.data} selectedMonth={month} onSelectMonth={setMonth} /> : <Skeleton className="h-64" />}
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
            <EmptyState icon={<Receipt size={20} />} title="No spending yet" action={<Button onClick={() => openAdd('expense')}>Add an expense</Button>}>
              Expenses you log for {label} will be ranked here.
            </EmptyState>
          )}
        </Panel>

        {dailyPanel}
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
            <EmptyState icon={<Receipt size={20} />} title="Nothing logged yet" action={<Button onClick={() => openAdd('expense')}>Add your first expense</Button>}>
              Your latest income and expenses will appear here.
            </EmptyState>
          )}
        </Panel>
      </div>
        </>
      )}
    </div>
  );
}
