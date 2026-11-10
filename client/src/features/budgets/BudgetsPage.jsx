import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { currentMonthKey, shiftMonth, formatMonthLabel, budgetFormSchema, fromMinor } from '@kosha/shared';
import { Plus, Copy, Pencil, Trash2, PiggyBank } from 'lucide-react';
import { useBudgets, useCategories, useSaveBudget, useDeleteBudget, useCopyBudgets } from '../../api/hooks.js';
import { PageHeader } from '../../components/layout/AppShell.jsx';
import { MonthPicker } from '../../components/ui/MonthPicker.jsx';
import { Button, Dialog, Field, Input, Select, Skeleton, EmptyState } from '../../components/ui/primitives.jsx';
import { CategoryIcon } from '../../components/ui/CategoryIcon.jsx';
import { BudgetMeter } from '../../components/charts/BudgetMeter.jsx';
import { useToast } from '../../components/ui/toast.jsx';
import { moneyWhole, money } from '../../lib/format.js';

function BudgetForm({ month, categories, editing, presetCategory, onDone }) {
  const save = useSaveBudget();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      category: editing?.category.id ?? presetCategory ?? '',
      month,
      limit: editing ? fromMinor(editing.limit) : '',
    },
  });

  const onSubmit = async (values) => {
    try {
      await save.mutateAsync(values);
      toast.success(`Budget saved for ${formatMonthLabel(month)}`);
      onDone();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <input type="hidden" {...register('month')} />
      <Field label="Category" error={errors.category?.message}>
        {(a11y) => (
          <Select {...a11y} {...register('category')} disabled={Boolean(editing)}>
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Monthly limit (₹)" error={errors.limit?.message} hint="You'll see a heads-up at 75% and a warning past 100%.">
        {(a11y) => <Input {...a11y} {...register('limit')} inputMode="decimal" placeholder="e.g. 6000" className="tabular" autoFocus />}
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          Save budget
        </Button>
      </div>
    </form>
  );
}

export default function BudgetsPage() {
  const [month, setMonth] = useState(currentMonthKey());
  const [dialog, setDialog] = useState(null); // { editing?, presetCategory? }
  const { data, isLoading } = useBudgets(month);
  const { data: categories = [] } = useCategories({ type: 'expense' });
  const remove = useDeleteBudget();
  const copy = useCopyBudgets();
  const toast = useToast();

  const budgeted = new Set(data?.items.map((b) => b.category.id));
  const unbudgeted = categories.filter((c) => !budgeted.has(c.id));
  const totals = data?.totals;
  const prev = shiftMonth(month, -1);

  const copyFromPrevious = () =>
    copy.mutate(
      { from: prev, to: month },
      {
        onSuccess: (r) =>
          r.copied
            ? toast.success(`Copied ${r.copied} ${r.copied === 1 ? 'budget' : 'budgets'} from ${formatMonthLabel(prev)}`)
            : toast.success(`Nothing new to copy from ${formatMonthLabel(prev)}`),
        onError: (e) => toast.error(e.message),
      },
    );

  return (
    <>
      <PageHeader
        title="Budgets"
        description="Set a monthly limit per category and see how much room is left."
        actions={
          <>
            <MonthPicker value={month} onChange={setMonth} />
            <Button variant="secondary" onClick={copyFromPrevious} loading={copy.isPending}>
              <Copy size={16} aria-hidden />
              Copy {formatMonthLabel(prev, { short: true })}
            </Button>
            <Button onClick={() => setDialog({})}>
              <Plus size={18} aria-hidden />
              Add budget
            </Button>
          </>
        }
      />

      {isLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : !data?.items.length ? (
        <section className="rounded-2xl bg-surface ring-1 ring-line">
          <EmptyState
            icon={<PiggyBank size={22} />}
            title={`No budgets for ${formatMonthLabel(month)}`}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={() => setDialog({})}>Add a budget</Button>
                <Button variant="secondary" onClick={copyFromPrevious}>
                  Copy from {formatMonthLabel(prev)}
                </Button>
              </div>
            }
          >
            Start with your two or three biggest categories. Groceries and dining out are good first picks.
          </EmptyState>
        </section>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-2xl bg-surface ring-1 ring-line">
            <div className="border-b border-line p-5 sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-ink-2">Spent of total budget</p>
                  <p className="font-condensed text-[2.25rem] leading-tight font-semibold">
                    {moneyWhole(totals.spent)}{' '}
                    <span className="text-xl font-medium text-ink-3">/ {moneyWhole(totals.limit)}</span>
                  </p>
                </div>
                <p className={`text-[0.9375rem] font-semibold ${totals.remaining < 0 ? 'text-bad-text' : 'text-ink'}`}>
                  {totals.remaining >= 0 ? `${moneyWhole(totals.remaining)} left` : `${moneyWhole(-totals.remaining)} over`}
                </p>
              </div>
              <BudgetMeter
                className="mt-4"
                spent={totals.spent}
                limit={totals.limit}
                status={totals.spent > totals.limit ? 'over' : totals.spent / totals.limit >= 0.75 ? 'warning' : 'ok'}
                showLabel={false}
              />
            </div>

            <ul className="divide-y divide-line">
              {data.items.map((b) => (
                <li key={b.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-4 px-5 py-4 sm:px-6">
                  <CategoryIcon icon={b.category.icon} color={b.category.color} size="lg" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                      <p className="font-semibold">{b.category.name}</p>
                      <p className="text-sm text-ink-2 tabular">
                        <span className="font-semibold text-ink">{money(b.spent, { decimals: 0 })}</span> of {money(b.limit, { decimals: 0 })}
                        <span className="text-ink-3"> ({b.percentUsed}%)</span>
                      </p>
                    </div>
                    <BudgetMeter className="mt-2" spent={b.spent} limit={b.limit} status={b.status} />
                    <p className="mt-1.5 text-[0.8125rem] text-ink-3">
                      {b.remaining >= 0 ? `${moneyWhole(b.remaining)} left` : `${moneyWhole(-b.remaining)} over the limit`}, {b.transactionCount}{' '}
                      {b.transactionCount === 1 ? 'transaction' : 'transactions'}
                    </p>
                  </div>
                  <div className="flex gap-0.5">
                    <Button variant="ghost" size="icon" aria-label={`Edit ${b.category.name} budget`} onClick={() => setDialog({ editing: b })}>
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${b.category.name} budget`}
                      onClick={() =>
                        remove.mutate(b.id, {
                          onSuccess: () => toast.success(`Removed the ${b.category.name} budget`),
                          onError: (e) => toast.error(e.message),
                        })
                      }
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {unbudgeted.length > 0 && (
            <aside className="self-start rounded-2xl bg-surface p-5 ring-1 ring-line">
              <h2 className="font-wide font-semibold">Not budgeted yet</h2>
              <p className="mt-1 text-sm text-ink-2">Spending in these categories isn&apos;t tracked against a limit.</p>
              <ul className="mt-4 flex flex-col gap-1">
                {unbudgeted.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setDialog({ presetCategory: c.id })}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-surface-2"
                    >
                      <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                      <span className="flex-1">{c.name}</span>
                      <Plus size={16} className="text-ink-3" aria-label="Add budget" />
                    </button>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>
      )}

      <Dialog
        open={Boolean(dialog)}
        onClose={() => setDialog(null)}
        title={dialog?.editing ? `Edit ${dialog.editing.category.name} budget` : 'Add a budget'}
        description={formatMonthLabel(month)}
      >
        {dialog && (
          <BudgetForm
            month={month}
            categories={dialog.editing ? categories : unbudgeted.length ? unbudgeted : categories}
            editing={dialog.editing}
            presetCategory={dialog.presetCategory}
            onDone={() => setDialog(null)}
          />
        )}
      </Dialog>
    </>
  );
}
