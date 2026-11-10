import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { formatMonthLabel } from '@kosha/shared';
import { useChartColors } from '../../app/theme.jsx';
import { money, moneyCompact } from '../../lib/format.js';
import { ChartTooltip, LegendItem } from './ChartTooltip.jsx';

function TooltipContent({ active, payload, colors }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <ChartTooltip
      title={formatMonthLabel(row.month)}
      rows={[
        { label: 'Income', value: money(row.income), color: colors.income },
        { label: 'Spent', value: money(row.expense), color: colors.expense },
      ]}
      footer={`${row.net >= 0 ? 'Saved' : 'Overspent'} ${money(Math.abs(row.net))}`}
    />
  );
}

/**
 * Monthly income vs spending, grouped bars. The selected month is drawn at full
 * strength and the others recede, so the chart also shows where you are.
 */
export function CashFlowChart({ data = [], selectedMonth, height = 260 }) {
  const c = useChartColors();
  const rows = data.map((d) => ({ ...d, label: formatMonthLabel(d.month, { short: true }) }));
  const selected = data.find((d) => d.month === selectedMonth) ?? data.at(-1);

  return (
    <div>
      {selected && (
        <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1">
          <LegendItem color={c.income} label={`Income, ${formatMonthLabel(selected.month, { short: true })}`} value={money(selected.income, { decimals: 0 })} />
          <LegendItem color={c.expense} label="Spent" value={money(selected.expense, { decimals: 0 })} />
        </div>
      )}
      <div style={{ height }} role="img" aria-label="Bar chart of monthly income and spending">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} barGap={2} barCategoryGap="26%" margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={c.grid} />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: c.axis }} tick={{ fill: c.ink3, fontSize: 12 }} interval="preserveStartEnd" />
            <YAxis
              tickFormatter={(v) => moneyCompact(v)}
              width={58}
              tickLine={false}
              axisLine={false}
              tick={{ fill: c.ink3, fontSize: 12 }}
            />
            <Tooltip cursor={{ fill: c.surface2 }} content={<TooltipContent colors={c} />} />
            {['income', 'expense'].map((key) => (
              <Bar key={key} dataKey={key} name={key} fill={c[key]} radius={[4, 4, 0, 0]} maxBarSize={20} isAnimationActive={false}>
                {rows.map((r) => (
                  <Cell key={r.month} fillOpacity={!selectedMonth || r.month === selectedMonth ? 1 : 0.5} />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
