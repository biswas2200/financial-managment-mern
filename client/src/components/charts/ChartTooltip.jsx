/** Shared tooltip shell for Recharts: values in ink, the coloured swatch carries identity. */
export function ChartTooltip({ title, rows, footer }) {
  return (
    <div className="min-w-44 rounded-xl bg-surface px-3.5 py-3 text-sm shadow-[var(--shadow-pop)] ring-1 ring-line">
      <p className="mb-1.5 font-semibold text-ink">{title}</p>
      <ul className="flex flex-col gap-1">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-2 text-ink-2">
              {r.color && <span aria-hidden className="h-2.5 w-2.5 rounded-[3px]" style={{ background: r.color }} />}
              {r.label}
            </span>
            <span className="font-medium tabular text-ink">{r.value}</span>
          </li>
        ))}
      </ul>
      {footer && <p className="mt-2 border-t border-line pt-2 text-ink-2">{footer}</p>}
    </div>
  );
}

/** Legend row with a swatch and an optional figure (doubles as a direct label). */
export function LegendItem({ color, label, value }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-ink-2">
      <span aria-hidden className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
      {label}
      {value && <span className="font-semibold text-ink tabular">{value}</span>}
    </span>
  );
}
