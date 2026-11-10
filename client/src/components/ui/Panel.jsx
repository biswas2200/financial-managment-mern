import { useState } from 'react';
import clsx from 'clsx';
import { Table, ChartColumn } from 'lucide-react';

/**
 * A titled section of the dashboard. If `table` is provided the panel offers a
 * "view as table" toggle: every chart has an accessible text equivalent.
 */
export function Panel({ title, subtitle, actions, table, children, className, bodyClassName, as: Tag = 'section' }) {
  const [showTable, setShowTable] = useState(false);
  return (
    <Tag className={clsx('flex min-w-0 flex-col rounded-2xl bg-surface ring-1 ring-line', className)}>
      {(title || actions || table) && (
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-5">
          <div className="min-w-0">
            {title && <h2 className="font-wide text-[1.0625rem] font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-ink-2">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            {table && (
              <button
                type="button"
                aria-pressed={showTable}
                onClick={() => setShowTable((s) => !s)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-ink-2 ring-1 ring-line hover:bg-surface-2 hover:text-ink aria-pressed:bg-surface-2 aria-pressed:text-ink"
              >
                {showTable ? <ChartColumn size={15} aria-hidden /> : <Table size={15} aria-hidden />}
                {showTable ? 'Chart' : 'Table'}
              </button>
            )}
          </div>
        </header>
      )}
      <div className={clsx('min-w-0 flex-1 px-5 pt-4 pb-5', bodyClassName)}>
        {showTable && table ? <DataTable {...table} /> : children}
      </div>
    </Tag>
  );
}

export function DataTable({ columns, rows, caption }) {
  return (
    <div className="max-h-80 overflow-auto scrollbar-thin">
      <table className="w-full text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="sticky top-0 bg-surface">
          <tr className="border-b border-line text-left text-ink-2">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={clsx('py-2 pr-4 font-medium', c.align === 'right' && 'text-right')}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.key ?? i} className="border-b border-line/60 last:border-0">
              {columns.map((c) => (
                <td key={c.key} className={clsx('py-2 pr-4', c.align === 'right' && 'tabular text-right')}>
                  {row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
