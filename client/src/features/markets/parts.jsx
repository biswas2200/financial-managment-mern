import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, Minus, Sparkles, Star, ChevronLeft, Info } from 'lucide-react';
import clsx from 'clsx';
import { formatPct, trend } from '@kosha/shared';
import { useWatchlist, useAddWatch, useRemoveWatch } from '../../api/hooks.js';
import { Button, ErrorNote } from '../../components/ui/primitives.jsx';
import { useToast } from '../../components/ui/toast.jsx';
import { dateLong } from '../../lib/format.js';
import { useCopilot } from '../assistant/CopilotDrawer.jsx';

const TREND = {
  up: { icon: ArrowUp, ink: 'text-income-text', word: 'up' },
  down: { icon: ArrowDown, ink: 'text-bad-text', word: 'down' },
  flat: { icon: Minus, ink: 'text-ink-2', word: 'unchanged' },
};

/** A move as a signed percentage with an arrow and a hidden word, so colour is never the only signal. */
export function Change({ pct, className }) {
  const t = trend(pct);
  const { icon: Icon, ink, word } = TREND[t];
  if (pct === null || pct === undefined || Number.isNaN(Number(pct))) return <span className={clsx('text-ink-3', className)}>–</span>;
  return (
    <span data-trend={t} className={clsx('tabular relative inline-flex items-center gap-0.5 font-semibold', ink, className)}>
      <Icon size={13} aria-hidden strokeWidth={2.5} />
      {formatPct(pct)}
      <span className="sr-only"> {word}</span>
    </span>
  );
}

/** Where the numbers come from, and that they are not live. */
export function DataNotice({ asOf, source = 'NSE India', className }) {
  return (
    <p className={clsx('flex items-start gap-2 text-[0.8125rem] text-ink-3', className)}>
      <Info size={15} aria-hidden className="mt-0.5 shrink-0" />
      <span>End-of-day data from {source} as of {dateLong(asOf)}. Not live, and not investment advice.</span>
    </p>
  );
}

/** A load failure in plain words, with a way to try again. */
export function MarketError({ error, onRetry }) {
  return <ErrorNote error={error} onRetry={onRetry} />;
}

export function BackLink({ to, children }) {
  return (
    <Link to={to} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-2 hover:text-ink">
      <ChevronLeft size={16} aria-hidden />
      {children}
    </Link>
  );
}

/** Adds or removes something from the watchlist. */
export function WatchButton({ kind, refId }) {
  const { data } = useWatchlist();
  const add = useAddWatch();
  const remove = useRemoveWatch();
  const toast = useToast();
  const entry = data?.items.find((i) => i.kind === kind && String(i.ref).toLowerCase() === String(refId).toLowerCase());
  const busy = add.isPending || remove.isPending;

  const toggle = () =>
    entry
      ? remove.mutate(entry.id, { onSuccess: () => toast.success('Removed from your watchlist'), onError: (e) => toast.error(e.message) })
      : add.mutate({ kind, ref: String(refId) }, { onSuccess: () => toast.success('Added to your watchlist'), onError: (e) => toast.error(e.message) });

  return (
    <Button variant="secondary" size="sm" aria-pressed={Boolean(entry)} disabled={busy} onClick={toggle}>
      <Star size={15} aria-hidden fill={entry ? 'currentColor' : 'none'} className={entry ? 'text-thread' : undefined} />
      {entry ? 'Remove from watchlist' : 'Add to watchlist'}
    </Button>
  );
}

/** What Copilot is asked about market data: to explain it, never to say what to buy. */
export const EXPLAIN_RULES = 'Explain it simply for a beginner, say what the numbers cannot tell me, and do not give buy or sell advice.';

export function AskCopilotButton({ label, prompt }) {
  const { open } = useCopilot();
  return (
    <Button variant="secondary" size="sm" onClick={() => open(prompt)}>
      <Sparkles size={15} aria-hidden />
      {label}
    </Button>
  );
}

/** Returns by period. `annualised` ones are yearly rates; a missing figure is a dash, never a zero. */
export function ReturnsTable({ rows, caption }) {
  return (
    <div className="overflow-x-auto">
      <table aria-label={caption} className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-ink-2">
            <th scope="col" className="py-2 pr-4 font-medium">Period</th>
            <th scope="col" className="py-2 pr-4 font-medium">Change</th>
            <th scope="col" className="py-2 font-medium">Measured from</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.period} className="border-b border-line/60 last:border-0">
              <th scope="row" className="py-2.5 pr-4 text-left font-medium">{r.label}</th>
              <td className="py-2.5 pr-4">
                <Change pct={r.pct} />
                {r.pct !== null && r.annualised && <span className="ml-1 text-ink-3">a year</span>}
              </td>
              <td className="py-2.5 text-ink-3">{r.from ? dateLong(r.from) : 'Not enough history'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Stat({ label, children, hint }) {
  return (
    <div>
      <dt className="text-[0.8125rem] text-ink-3">{label}</dt>
      <dd className="tabular mt-0.5 text-[1.0625rem] font-semibold">{children}</dd>
      {hint && <p className="mt-0.5 text-[0.8125rem] leading-snug text-ink-3">{hint}</p>}
    </div>
  );
}
