import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import { currentMonthKey, lastNMonthKeys, monthRange, toDayKey, formatMonthLabel } from '@kosha/shared';
import { useTrend, useCategoryTrend, useWeekday, useMerchants, useByCategory } from '../../api/hooks.js';
import { useChartColors } from '../../app/theme.jsx';
import { PageHeader } from '../../components/layout/AppShell.jsx';
import { Panel } from '../../components/ui/Panel.jsx';
import { Segmented, Skeleton, EmptyState } from '../../components/ui/primitives.jsx';
import { CategoryIcon } from '../../components/ui/CategoryIcon.jsx';
import { ChartTooltip } from '../../components/charts/ChartTooltip.jsx';
import { money, moneyWhole, moneyCompact, percent } from '../../lib/format.js';

function SavingsRateChart({ trend }) {
  const c = useChartColors();
  const rows = trend.map((m) => ({
    ...m,
    label: formatMonthLabel(m.month, { short: true }),
    rate: m.income ? Math.round((m.net / m.income) * 1000) / 10 : null,
  }));
  const avg = rows.filter((r) => r.rate !== null);
  const average = avg.length ? Math.round((avg.reduce((s, r) => s + r.rate, 0) / avg.length) * 10) / 10 : null;

  return (
    <>
      {average !== null && (
        <p className="mb-3 text-sm text-ink-2">
          Average <span className="font-semibold text-ink">{percent(average)}</span> of income kept each month
        </p>
      )}
      <div className="h-60" role="img" aria-label="Line chart of monthly savings rate">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={c.grid} />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: c.axis }} tick={{ fill: c.ink3, fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `${v}%`} width={44} tickLine={false} axisLine={false} tick={{ fill: c.ink3, fontSize: 12 }} />
            <ReferenceLine y={0} stroke={c.axis} />
            <Tooltip
              cursor={{ stroke: c.axis }}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <ChartTooltip
                    title={formatMonthLabel(payload[0].payload.month)}
                    rows={[
                      { label: 'Savings rate', value: percent(payload[0].payload.rate), color: c.income },
                      { label: 'Saved', value: money(payload[0].payload.net) },
                    ]}
                  />
                ) : null
              }
            />
            <Line
              type="monotone"
              dataKey="rate"
              stroke={c.income}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, stroke: c.surface, strokeWidth: 2 }}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

/** Small multiples: one single-hue bar chart per top category, on a shared scale. */
function CategoryMultiples({ data }) {
  const c = useChartColors();
  const max = Math.max(1, ...data.series.flatMap((s) => s.values));
  return (
    <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
      {data.series.map((s) => {
        const rows = data.months.map((m, i) => ({ month: m, label: formatMonthLabel(m, { short: true }), value: s.values[i] }));
        const total = s.values.reduce((a, b) => a + b, 0);
        const last = s.values.at(-1);
        return (
          <figure key={s.categoryId} className="min-w-0">
            <figcaption className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-semibold">{s.name}</span>
              <span className="text-[0.8125rem] text-ink-3 tabular">{moneyWhole(total)} total</span>
            </figcaption>
            <div className="mt-2 h-28" role="img" aria-label={`Monthly spending on ${s.name}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <YAxis hide domain={[0, max]} />
                  <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: c.axis }} tick={{ fill: c.ink3, fontSize: 10 }} interval="preserveStartEnd" />
                  <Tooltip
                    cursor={{ fill: c.surface2 }}
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <ChartTooltip title={formatMonthLabel(payload[0].payload.month)} rows={[{ label: s.name, value: money(payload[0].payload.value), color: c.expense }]} />
                      ) : null
                    }
                  />
                  <Bar dataKey="value" fill={s.categoryId === 'other' ? c.ink3 : c.expense} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1 text-[0.8125rem] text-ink-2">
              Latest month <span className="font-semibold text-ink tabular">{moneyWhole(last)}</span>
            </p>
          </figure>
        );
      })}
    </div>
  );
}

const DAY_NAMES = { Mon: 'Mondays', Tue: 'Tuesdays', Wed: 'Wednesdays', Thu: 'Thursdays', Fri: 'Fridays', Sat: 'Saturdays', Sun: 'Sundays' };

function WeekdayChart({ days }) {
  const c = useChartColors();
  const peak = days.reduce((a, b) => (b.total > a.total ? b : a), days[0]);
  return (
    <>
      <p className="mb-3 text-sm text-ink-2">
        You spend the most on <span className="font-semibold text-ink">{DAY_NAMES[peak.day]}</span>
        {peak.total ? `: ${moneyWhole(peak.total)} in this period` : ''}
      </p>
      <div className="h-52" role="img" aria-label="Bar chart of spending by day of week">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={days} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={c.grid} />
            <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: c.axis }} tick={{ fill: c.ink3, fontSize: 12 }} />
            <YAxis tickFormatter={moneyCompact} width={56} tickLine={false} axisLine={false} tick={{ fill: c.ink3, fontSize: 12 }} />
            <Tooltip
              cursor={{ fill: c.surface2 }}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <ChartTooltip
                    title={payload[0].payload.day}
                    rows={[
                      { label: 'Spent', value: money(payload[0].payload.total), color: c.expense },
                      { label: 'Transactions', value: payload[0].payload.count },
                    ]}
                  />
                ) : null
              }
            />
            <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false}>
              {days.map((d) => (
                <Cell key={d.day} fill={c.expense} fillOpacity={d.day === peak.day ? 1 : 0.38} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

function MerchantList({ merchants }) {
  const top = Math.max(...merchants.map((m) => m.total), 1);
  return (
    <ol className="flex flex-col gap-3">
      {merchants.map((m) => (
        <li key={m.merchant} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4">
          <div className="min-w-0">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-medium">{m.merchant}</span>
              <span className="text-[0.8125rem] text-ink-3">
                {m.count} {m.count === 1 ? 'payment' : 'payments'}
              </span>
            </div>
            <div className="h-2 rounded-full bg-surface-2">
              <div className="h-2 rounded-full bg-expense" style={{ width: `${(m.total / top) * 100}%` }} />
            </div>
          </div>
          <span className="w-24 text-right text-sm font-semibold tabular">{moneyWhole(m.total)}</span>
        </li>
      ))}
    </ol>
  );
}

export default function AnalyticsPage() {
  const [months, setMonths] = useState(6);
  const end = currentMonthKey();
  const range = useMemo(() => {
    const first = lastNMonthKeys(months, end)[0];
    return { from: toDayKey(monthRange(first).start), to: toDayKey(new Date()) };
  }, [months, end]);

  const trend = useTrend({ months, end });
  const categoryTrend = useCategoryTrend({ months, end, top: 5 });
  const weekday = useWeekday(range);
  const merchants = useMerchants({ ...range, limit: 8 });
  const breakdown = useByCategory({ ...range, type: 'expense' });

  const periodLabel = `${formatMonthLabel(lastNMonthKeys(months, end)[0], { short: true })} to ${formatMonthLabel(end, { short: true })}`;

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Patterns in how you earn and spend over time."
        actions={
          <Segmented
            label="Time range"
            value={String(months)}
            onChange={(v) => setMonths(Number(v))}
            options={[
              { value: '3', label: '3 months' },
              { value: '6', label: '6 months' },
              { value: '12', label: '12 months' },
            ]}
          />
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel
          title="Savings rate"
          subtitle={periodLabel}
          table={
            trend.data && {
              caption: 'Savings rate by month',
              columns: [
                { key: 'month', label: 'Month' },
                { key: 'income', label: 'Income', align: 'right' },
                { key: 'net', label: 'Saved', align: 'right' },
                { key: 'rate', label: 'Rate', align: 'right' },
              ],
              rows: trend.data.map((m) => ({
                key: m.month,
                month: formatMonthLabel(m.month),
                income: money(m.income),
                net: money(m.net),
                rate: m.income ? percent(Math.round((m.net / m.income) * 1000) / 10) : 'n/a',
              })),
            }
          }
        >
          {trend.data ? <SavingsRateChart trend={trend.data} /> : <Skeleton className="h-64" />}
        </Panel>

        <Panel
          title="Spending by weekday"
          subtitle={periodLabel}
          table={
            weekday.data && {
              columns: [
                { key: 'day', label: 'Day' },
                { key: 'count', label: 'Transactions', align: 'right' },
                { key: 'total', label: 'Spent', align: 'right' },
              ],
              rows: weekday.data.map((d) => ({ key: d.day, day: d.day, count: d.count, total: money(d.total) })),
            }
          }
        >
          {weekday.data ? <WeekdayChart days={weekday.data} /> : <Skeleton className="h-64" />}
        </Panel>
      </div>

      <Panel
        className="mt-5"
        title="Category trends"
        subtitle={`Monthly spending in your top categories, ${periodLabel}. Same scale in every chart.`}
        table={
          categoryTrend.data && {
            columns: [{ key: 'name', label: 'Category' }, ...categoryTrend.data.months.map((m) => ({ key: m, label: formatMonthLabel(m, { short: true }), align: 'right' }))],
            rows: categoryTrend.data.series.map((s) => ({
              key: s.categoryId,
              name: s.name,
              ...Object.fromEntries(categoryTrend.data.months.map((m, i) => [m, moneyWhole(s.values[i])])),
            })),
          }
        }
      >
        {!categoryTrend.data ? (
          <Skeleton className="h-64" />
        ) : categoryTrend.data.series.length ? (
          <CategoryMultiples data={categoryTrend.data} />
        ) : (
          <EmptyState title="Not enough history yet">Category trends appear once you have a few months of spending.</EmptyState>
        )}
      </Panel>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Panel title="Top merchants" subtitle={periodLabel}>
          {!merchants.data ? (
            <Skeleton className="h-64" />
          ) : merchants.data.length ? (
            <MerchantList merchants={merchants.data} />
          ) : (
            <EmptyState title="No merchants recorded">Add a merchant when you log an expense to see it here.</EmptyState>
          )}
        </Panel>

        <Panel title="Category breakdown" subtitle={breakdown.data ? `${moneyWhole(breakdown.data.total)} spent, ${periodLabel}` : periodLabel}>
          {!breakdown.data ? (
            <Skeleton className="h-64" />
          ) : (
            <div className="max-h-[26rem] overflow-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface text-left text-ink-2">
                  <tr className="border-b border-line">
                    <th scope="col" className="py-2 pr-3 font-medium">Category</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Count</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Avg per month</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Total</th>
                    <th scope="col" className="py-2 pl-3 text-right font-medium">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.data.items.map((i) => (
                    <tr key={i.categoryId} className="border-b border-line/60 last:border-0">
                      <td className="py-2.5 pr-3">
                        <span className="flex items-center gap-2">
                          <CategoryIcon icon={i.icon} color={i.color} size="sm" />
                          {i.name}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular text-ink-2">{i.count}</td>
                      <td className="px-3 py-2.5 text-right tabular text-ink-2">{moneyWhole(Math.round(i.total / months))}</td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular">{moneyWhole(i.total)}</td>
                      <td className="py-2.5 pl-3 text-right tabular text-ink-2">{percent(i.share)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
