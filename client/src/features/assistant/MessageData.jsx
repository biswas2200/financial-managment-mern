import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts';
import { Link } from 'react-router-dom';
import { formatMonthLabel } from '@kosha/shared';
import { useChartColors } from '../../app/theme.jsx';
import { money, moneyWhole, percent, rupees, level, dateLong } from '../../lib/format.js';
import { Change } from '../markets/parts.jsx';
import { useCopilot } from './CopilotDrawer.jsx';
import { CategoryBars } from '../../components/charts/CategoryBars.jsx';
import { BudgetMeter } from '../../components/charts/BudgetMeter.jsx';
import { ChartTooltip } from '../../components/charts/ChartTooltip.jsx';
import { TransactionRow } from '../transactions/TransactionRow.jsx';

function Figure({ label, value, tone }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.8125rem] text-ink-3">{label}</p>
      <p className={`font-condensed text-lg font-semibold tabular ${tone ?? ''}`}>{value}</p>
    </div>
  );
}

function MiniTrend({ items }) {
  const c = useChartColors();
  const rows = items.map((m) => ({ ...m, label: formatMonthLabel(m.month, { short: true }) }));
  return (
    <div className="h-36" role="img" aria-label="Monthly income and spending">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} barGap={2} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: c.axis }} tick={{ fill: c.ink3, fontSize: 11 }} />
          <Tooltip
            cursor={false}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <ChartTooltip
                  title={formatMonthLabel(payload[0].payload.month)}
                  rows={[
                    { label: 'Income', value: money(payload[0].payload.income), color: c.income },
                    { label: 'Spent', value: money(payload[0].payload.expense), color: c.expense },
                  ]}
                />
              ) : null
            }
          />
          <Bar dataKey="income" fill={c.income} radius={[3, 3, 0, 0]} maxBarSize={12} isAnimationActive={false} />
          <Bar dataKey="expense" fill={c.expense} radius={[3, 3, 0, 0]} maxBarSize={12} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const priceText = { stock: (v) => rupees(v), index: (v) => level(v), fund: (v) => rupees(v, { decimals: 4 }) };

/** Renders the chart/table payload a Copilot reply carries (data.kind). */
export function MessageData({ data }) {
  const { close } = useCopilot();
  if (!data) return null;
  const frame = 'mt-3 rounded-xl raised bg-surface p-4 shadow-raise-1';

  switch (data.kind) {
    case 'summary':
      return (
        <div className={`${frame} grid grid-cols-3 gap-3`}>
          <Figure label="Income" value={moneyWhole(data.income)} />
          <Figure label="Spent" value={moneyWhole(data.expense)} />
          <Figure
            label={data.net >= 0 ? 'Saved' : 'Overspent'}
            value={moneyWhole(Math.abs(data.net))}
            tone={data.net >= 0 ? 'text-income-text' : 'text-bad-text'}
          />
        </div>
      );
    case 'categories':
      return data.items.length ? (
        <div className={frame}>
          <CategoryBars items={data.items} max={5} color={data.type === 'income' ? 'var(--income)' : 'var(--expense)'} />
        </div>
      ) : null;
    case 'budgets':
      return data.items.length ? (
        <ul className={`${frame} flex flex-col gap-3`}>
          {data.items.slice(0, 5).map((b) => (
            <li key={b.name}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium">{b.name}</span>
                <span className="text-ink-2 tabular">
                  {moneyWhole(b.spent)} / {moneyWhole(b.limit)}
                </span>
              </div>
              <BudgetMeter spent={b.spent} limit={b.limit} status={b.status} />
            </li>
          ))}
        </ul>
      ) : null;
    case 'transactions':
      return data.items.length ? (
        <div className={`${frame} divide-y divide-line/70 py-1`}>
          {data.items.slice(0, 6).map((t) => (
            <TransactionRow key={t.id} txn={t} />
          ))}
        </div>
      ) : null;
    case 'trend':
      return (
        <div className={frame}>
          <MiniTrend items={data.items} />
        </div>
      );
    case 'comparison':
      return (
        <div className={frame}>
          <div className="grid grid-cols-2 gap-3 border-b border-line pb-3">
            <Figure label={`${data.a.label} spent`} value={moneyWhole(data.a.expense)} />
            <Figure label={`${data.b.label} spent`} value={moneyWhole(data.b.expense)} />
          </div>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            {data.categories
              .filter((c) => c.delta !== 0)
              .map((c) => (
                <li key={c.name} className="flex justify-between gap-3">
                  <span className="text-ink-2">{c.name}</span>
                  <span className={`font-medium tabular ${c.delta > 0 ? 'text-bad-text' : 'text-good-text'}`}>
                    {money(c.delta, { signed: true, decimals: 0 })}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      );
    case 'anomalies':
      return data.items.length ? (
        <ul className={`${frame} flex flex-col gap-2 text-sm`}>
          {data.items.map((a) => (
            <li key={a.categoryId} className="flex justify-between gap-3">
              <span className="font-medium">{a.name}</span>
              <span className="text-ink-2 tabular">
                {moneyWhole(a.current)} vs usual {moneyWhole(a.average)}
                {a.ratio ? ` (${percent((a.ratio - 1) * 100, { signed: true })})` : ''}
              </span>
            </li>
          ))}
        </ul>
      ) : null;
    case 'articles':
      return (
        <ul className="mt-3 flex flex-col gap-2">
          {data.items.map((a) => (
            <li key={a.slug}>
              <Link to={`/learn/${a.slug}`} onClick={close} className="raised block rounded-xl bg-surface p-4 shadow-raise-1 transition-colors hover:bg-surface-2">
                <span className="block font-semibold">{a.title}</span>
                <span className="mt-0.5 block text-sm text-ink-2">{a.summary}</span>
                <span className="mt-1.5 block text-[0.8125rem] text-ink-3">{a.readMinutes} min read, in Learn</span>
              </Link>
            </li>
          ))}
        </ul>
      );
    case 'quote':
      return (
        <div className={frame}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="min-w-0 font-semibold">{data.name}</p>
            <p className="tabular text-lg font-semibold">{(priceText[data.type] ?? priceText.stock)(data.price)}</p>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-ink-3">End-of-day, {dateLong(data.asOf)}</span>
            {data.changePct !== null && data.changePct !== undefined && <Change pct={data.changePct} />}
          </div>
          {data.returns?.length > 0 && (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-3 sm:grid-cols-3">
              {data.returns.map((r) => (
                <div key={r.period}>
                  <dt className="text-[0.8125rem] text-ink-3">{r.label}</dt>
                  <dd className="text-sm">
                    <Change pct={r.pct} />
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      );
    case 'market':
      return (
        <div className={frame}>
          <ul className="grid grid-cols-2 gap-3">
            {data.indices.map((i) => (
              <li key={i.name}>
                <p className="text-[0.8125rem] text-ink-3">{i.name}</p>
                <p className="tabular font-semibold">{level(i.close)}</p>
                <p className="text-sm">
                  <Change pct={i.changePct} />
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-line pt-3 text-sm text-ink-2">
            <strong className="tabular text-income-text">{data.breadth.advancers.toLocaleString('en-IN')} advancing</strong>,{' '}
            <strong className="tabular text-bad-text">{data.breadth.decliners.toLocaleString('en-IN')} declining</strong>
          </p>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {data.gainers.map((g) => (
              <span key={g.symbol} className="inline-flex items-center gap-1.5">
                <span className="font-semibold">{g.symbol}</span>
                <Change pct={g.changePct} />
              </span>
            ))}
            {data.losers.map((g) => (
              <span key={g.symbol} className="inline-flex items-center gap-1.5">
                <span className="font-semibold">{g.symbol}</span>
                <Change pct={g.changePct} />
              </span>
            ))}
          </p>
          <p className="mt-2 text-[0.8125rem] text-ink-3">End-of-day figures from the NSE as of {dateLong(data.asOf)}. Not live.</p>
        </div>
      );
    default:
      return null;
  }
}
