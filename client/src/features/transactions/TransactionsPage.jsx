import { useEffect, useMemo, useReducer, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { Download, Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, Receipt, X } from 'lucide-react';
import { PAYMENT_METHODS, toDayKey } from '@kosha/shared';
import { useCategories, useTransactions, useDeleteTransaction, useSaveTransaction } from '../../api/hooks.js';
import { downloadUrl } from '../../api/client.js';
import { PageHeader, useQuickAdd } from '../../components/layout/AppShell.jsx';
import { Button, Input, Select, Segmented, Skeleton, EmptyState, ErrorNote } from '../../components/ui/primitives.jsx';
import { CategoryIcon } from '../../components/ui/CategoryIcon.jsx';
import { useToast } from '../../components/ui/toast.jsx';
import { money, dayHeader, timeOfDay } from '../../lib/format.js';
import {
  filtersReducer,
  filtersFromSearchParams,
  filtersToSearchParams,
  filtersToQuery,
  activeFilterCount,
} from './filters.js';
import { Amount } from './TransactionRow.jsx';

const PAYMENT_LABELS = { UPI: 'UPI', Card: 'Card', Cash: 'Cash', Bank: 'Bank transfer', Wallet: 'Wallet' };
const SORT_LABELS = { '-date': 'Newest first', date: 'Oldest first', '-amount': 'Largest amount', amount: 'Smallest amount' };

function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function groupByDay(items) {
  const groups = [];
  for (const t of items) {
    const key = toDayKey(new Date(t.date));
    const last = groups.at(-1);
    if (last?.key === key) last.items.push(t);
    else groups.push({ key, items: [t] });
  }
  return groups;
}

export default function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, dispatch] = useReducer(filtersReducer, searchParams, filtersFromSearchParams);
  const [search, setSearch] = useState(filters.q);
  const debouncedSearch = useDebounced(search);
  const { openAdd, openEdit } = useQuickAdd();
  const toast = useToast();

  // Search box → filters (debounced), filters → URL.
  useEffect(() => {
    if (debouncedSearch !== filters.q) dispatch({ type: 'set', field: 'q', value: debouncedSearch });
  }, [debouncedSearch, filters.q]);
  useEffect(() => {
    setSearchParams(filtersToSearchParams(filters), { replace: true });
  }, [filters, setSearchParams]);

  const query = useMemo(() => filtersToQuery(filters), [filters]);
  const { data, isLoading, isError, error, refetch, isPlaceholderData } = useTransactions(query);
  const { data: categories = [] } = useCategories();
  const remove = useDeleteTransaction();
  const restore = useSaveTransaction();

  const categoryOptions = categories.filter((c) => !filters.type || c.type === filters.type);
  const set = (field) => (e) => dispatch({ type: 'set', field, value: e?.target ? e.target.value : e });
  const activeCount = activeFilterCount(filters);
  const { page: _page, limit: _limit, ...exportQuery } = query;

  const handleDelete = (txn) => {
    remove.mutate(txn, {
      onSuccess: () =>
        toast.success(`Deleted "${txn.description}"`, {
          action: {
            label: 'Undo',
            onClick: () => {
              const { id, user, createdAt, updatedAt, source, category, ...rest } = txn;
              restore.mutate(
                { ...rest, category: category.id },
                { onSuccess: () => toast.success('Transaction restored'), onError: (e) => toast.error(e.message) },
              );
            },
          },
        }),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Every rupee in and out. Filter, search, edit or export."
        actions={
          <>
            <a
              href={downloadUrl('/transactions/export.csv', exportQuery)}
              className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-surface px-4 text-[0.9375rem] font-semibold ring-1 ring-line-strong ring-inset hover:bg-surface-2"
            >
              <Download size={17} aria-hidden />
              Export CSV
            </a>
            <Button onClick={openAdd}>
              <Plus size={18} aria-hidden />
              Add transaction
            </Button>
          </>
        }
      />

      <section aria-label="Filters" className="rounded-2xl bg-surface p-4 ring-1 ring-line">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1">
            <Search size={17} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" aria-hidden />
            <label htmlFor="txn-search" className="sr-only">
              Search transactions
            </label>
            <Input
              id="txn-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description or merchant"
              className="pl-9"
            />
          </div>
          <Segmented
            label="Type"
            value={filters.type}
            onChange={set('type')}
            options={[
              { value: '', label: 'All' },
              { value: 'expense', label: 'Expenses' },
              { value: 'income', label: 'Income' },
            ]}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <label className="flex flex-col gap-1 text-[0.8125rem] text-ink-2">
            Category
            <Select value={filters.category} onChange={set('category')}>
              <option value="">All categories</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-[0.8125rem] text-ink-2">
            Payment method
            <Select value={filters.paymentMethod} onChange={set('paymentMethod')}>
              <option value="">Any method</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_LABELS[m]}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-[0.8125rem] text-ink-2">
            From
            <Input type="date" value={filters.from} max={filters.to || undefined} onChange={set('from')} />
          </label>
          <label className="flex flex-col gap-1 text-[0.8125rem] text-ink-2">
            To
            <Input type="date" value={filters.to} min={filters.from || undefined} onChange={set('to')} />
          </label>
          <label className="flex flex-col gap-1 text-[0.8125rem] text-ink-2">
            Min amount (₹)
            <Input inputMode="decimal" value={filters.min} onChange={set('min')} placeholder="0" />
          </label>
          <label className="flex flex-col gap-1 text-[0.8125rem] text-ink-2">
            Max amount (₹)
            <Input inputMode="decimal" value={filters.max} onChange={set('max')} placeholder="Any" />
          </label>
        </div>
      </section>

      <div className="mt-4 mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-2" aria-live="polite">
          {data ? (
            <>
              <span className="font-semibold text-ink">{data.total.toLocaleString('en-IN')}</span>{' '}
              {data.total === 1 ? 'transaction' : 'transactions'}
              {data.summary.expense > 0 && (
                <>
                  , <span className="font-semibold text-ink">{money(data.summary.expense, { decimals: 0 })}</span> spent
                </>
              )}
              {data.summary.income > 0 && (
                <>
                  , <span className="font-semibold text-income-text">{money(data.summary.income, { decimals: 0 })}</span> received
                </>
              )}
            </>
          ) : (
            'Loading…'
          )}
        </p>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                dispatch({ type: 'reset' });
              }}
            >
              <X size={15} aria-hidden />
              Clear {activeCount} {activeCount === 1 ? 'filter' : 'filters'}
            </Button>
          )}
          <label className="flex items-center gap-2 text-sm text-ink-2">
            Sort
            <Select value={filters.sort} onChange={set('sort')} className="h-9 w-44">
              {Object.entries(SORT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
        </div>
      </div>

      {isError && <ErrorNote error={error} onRetry={refetch} />}

      <section className={clsx('overflow-hidden rounded-2xl bg-surface ring-1 ring-line', isPlaceholderData && 'opacity-60')}>
        {isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={<Receipt size={20} />}
            title={activeCount ? 'No transactions match these filters' : 'No transactions yet'}
            action={activeCount ? undefined : <Button onClick={openAdd}>Add a transaction</Button>}
          >
            {activeCount ? 'Try widening the date range or clearing a filter.' : 'Log your first expense or income to get started.'}
          </EmptyState>
        ) : (
          <table className="w-full text-[0.9375rem]">
            <caption className="sr-only">Transactions</caption>
            <thead className="hidden border-b border-line bg-surface-2/50 text-left text-sm text-ink-2 md:table-header-group">
              <tr>
                <th scope="col" className="py-2.5 pr-3 pl-5 font-medium">
                  Description
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Category
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Method
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                  Amount
                </th>
                <th scope="col" className="w-24 py-2.5 pr-5 pl-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            {(filters.sort.endsWith('date') ? groupByDay(data.items) : [{ key: 'all', items: data.items }]).map((group) => (
              <tbody key={group.key} className="border-b border-line last:border-0">
                {group.key !== 'all' && (
                  <tr>
                    <th colSpan={5} scope="rowgroup" className="bg-surface-2/40 py-2 pl-5 text-left text-[0.8125rem] font-semibold text-ink-2">
                      {dayHeader(group.key)}
                    </th>
                  </tr>
                )}
                {group.items.map((t) => (
                  <tr key={t.id} className="group border-t border-line/60 first:border-0 hover:bg-surface-2/40">
                    <td className="py-3 pr-3 pl-5">
                      <div className="flex items-center gap-3">
                        <CategoryIcon icon={t.category?.icon} color={t.category?.color} className="md:hidden" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{t.description}</p>
                          <p className="truncate text-[0.8125rem] text-ink-3">
                            {[t.merchant, timeOfDay(t.date), t.source === 'copilot' ? 'added by Copilot' : null].filter(Boolean).join(', ')}
                            <span className="md:hidden">{t.category ? `, ${t.category.name}` : ''}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-3 py-3 md:table-cell">
                      <span className="inline-flex items-center gap-2">
                        <CategoryIcon icon={t.category?.icon} color={t.category?.color} size="sm" />
                        <span className="text-sm">{t.category?.name}</span>
                      </span>
                    </td>
                    <td className="hidden px-3 py-3 text-sm text-ink-2 md:table-cell">{PAYMENT_LABELS[t.paymentMethod]}</td>
                    <td className="px-3 py-3 text-right">
                      <Amount txn={t} />
                    </td>
                    <td className="py-3 pr-4 pl-1">
                      <div className="flex justify-end gap-0.5 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                        <Button variant="ghost" size="icon" aria-label={`Edit ${t.description}`} onClick={() => openEdit(t)}>
                          <Pencil size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label={`Delete ${t.description}`} onClick={() => handleDelete(t)}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        )}
      </section>

      {data && data.totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3">
          <Button variant="secondary" size="sm" disabled={filters.page <= 1} onClick={() => dispatch({ type: 'page', page: filters.page - 1 })}>
            <ChevronLeft size={16} aria-hidden />
            Previous
          </Button>
          <p className="text-sm text-ink-2">
            Page {filters.page} of {data.totalPages}
          </p>
          <Button
            variant="secondary"
            size="sm"
            disabled={filters.page >= data.totalPages}
            onClick={() => dispatch({ type: 'page', page: filters.page + 1 })}
          >
            Next
            <ChevronRight size={16} aria-hidden />
          </Button>
        </nav>
      )}
    </>
  );
}
