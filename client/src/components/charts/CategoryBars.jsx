import { CategoryIcon } from '../ui/CategoryIcon.jsx';
import { moneyWhole, percent } from '../../lib/format.js';

/**
 * Ranked horizontal bars, one hue: compares categories more precisely than a donut.
 * Each row prints its own amount and share, so nothing hides behind a tooltip.
 */
export function CategoryBars({ items = [], max = 7, color = 'var(--expense)' }) {
  const shown = items.slice(0, max);
  const rest = items.slice(max);
  const rows = rest.length
    ? [
        ...shown,
        {
          categoryId: 'rest',
          name: `${rest.length} more ${rest.length === 1 ? 'category' : 'categories'}`,
          total: rest.reduce((s, r) => s + r.total, 0),
          share: Math.round(rest.reduce((s, r) => s + r.share, 0) * 10) / 10,
          icon: 'circle',
          color: '#848ca8',
        },
      ]
    : shown;
  const top = Math.max(...rows.map((r) => r.total), 1);

  return (
    <ul className="flex flex-col gap-3.5">
      {rows.map((r) => (
        <li key={r.categoryId} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3">
          <CategoryIcon icon={r.icon} color={r.color} size="sm" />
          <div className="min-w-0">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-medium">{r.name}</span>
              <span className="text-[0.8125rem] text-ink-3 tabular">{percent(r.share)}</span>
            </div>
            <div className="h-2 rounded-full bg-surface-2">
              <div className="h-2 rounded-full" style={{ width: `${Math.max((r.total / top) * 100, 1.5)}%`, background: color }} />
            </div>
          </div>
          <span className="w-[5.5rem] text-right text-sm font-semibold tabular">{moneyWhole(r.total)}</span>
        </li>
      ))}
    </ul>
  );
}
