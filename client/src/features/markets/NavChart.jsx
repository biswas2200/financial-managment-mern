import { useId } from 'react';
import { rupees, dateShort } from '../../lib/format.js';

const W = 640;
const H = 240;
const PAD = { top: 16, right: 12, bottom: 28, left: 64 };

/** A line chart of a fund's NAV over time. It is an image with a text description; the Panel around it offers the same data as a table. */
export function NavChart({ history }) {
  const gradientId = useId().replace(/:/g, '');
  if (!history?.length) return null;
  const first = history[0];
  const last = history.at(-1);
  const t0 = Date.parse(first.day);
  const t1 = Date.parse(last.day);
  const navs = history.map((p) => p.nav);
  const lo = Math.min(...navs);
  const hi = Math.max(...navs);
  const span = hi - lo || 1;
  const x = (day) => PAD.left + ((Date.parse(day) - t0) / (t1 - t0 || 1)) * (W - PAD.left - PAD.right);
  const y = (nav) => PAD.top + (1 - (nav - lo) / span) * (H - PAD.top - PAD.bottom);
  const line = history.map((p, i) => `${i ? 'L' : 'M'}${x(p.day).toFixed(1)},${y(p.nav).toFixed(1)}`).join(' ');
  const area = `${line} L${x(last.day).toFixed(1)},${H - PAD.bottom} L${x(first.day).toFixed(1)},${H - PAD.bottom} Z`;
  const ticks = [lo, lo + span / 2, hi];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`NAV from ${rupees(first.nav, { decimals: 4 })} to ${rupees(last.nav, { decimals: 4 })}, ${dateShort(first.day)} to ${dateShort(last.day)}`}
      className="h-auto w-full"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--brand)" stopOpacity="0.22" />
          <stop offset="1" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--grid)" />
          <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--ink-3)">
            {rupees(t, { decimals: 0 })}
          </text>
        </g>
      ))}
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(last.day)} cy={y(last.nav)} r="3.5" fill="var(--brand)" />
      <text x={PAD.left} y={H - 8} fontSize="11" fill="var(--ink-3)">{dateShort(first.day)}</text>
      <text x={W - PAD.right} y={H - 8} textAnchor="end" fontSize="11" fill="var(--ink-3)">{dateShort(last.day)}</text>
    </svg>
  );
}
