import { Link, useParams } from 'react-router-dom';
import { useStock } from '../../api/hooks.js';
import { Panel } from '../../components/ui/Panel.jsx';
import { Skeleton } from '../../components/ui/primitives.jsx';
import { crore, integer, rupees } from '../../lib/format.js';
import { AskCopilotButton, BackLink, Change, DataNotice, EXPLAIN_RULES, MarketError, ReturnsTable, Stat, WatchButton } from './parts.jsx';

export default function StockDetail() {
  const { symbol } = useParams();
  const { data: s, isLoading, error, refetch } = useStock(symbol);

  if (isLoading) {
    return (
      <>
        <BackLink to="/markets/stocks">Back to stocks</BackLink>
        <Skeleton className="h-72 rounded-2xl" />
      </>
    );
  }
  if (error || !s) {
    return (
      <>
        <BackLink to="/markets/stocks">Back to stocks</BackLink>
        <MarketError error={error} onRetry={error?.status === 404 ? undefined : refetch} />
      </>
    );
  }

  const prompt = `Tell me about ${s.name} (${s.symbol}) using its latest numbers: price, today's move, and returns over 1 month, 6 months and 1 year. ${EXPLAIN_RULES}`;

  return (
    <>
      <BackLink to="/markets/stocks">Back to stocks</BackLink>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-wide text-[1.75rem] leading-tight font-semibold sm:text-[2.125rem]">{s.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
            <span className="font-semibold text-ink">{s.symbol}</span>
            {s.industry && <span>{s.industry}</span>}
            {s.inNifty50 && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[0.75rem] font-medium text-brand">Nifty 50</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <WatchButton kind="stock" refId={s.symbol} />
          <AskCopilotButton label="Ask Copilot about this stock" prompt={prompt} />
        </div>
      </header>

      <div className="flex flex-col gap-5">
        <section className="raised flex flex-wrap items-end justify-between gap-4 rounded-2xl bg-surface p-5 shadow-raise-1">
          <div>
            <p className="text-sm text-ink-2">Last close</p>
            <p className="tabular font-condensed text-[2.5rem] leading-tight font-semibold">{rupees(s.close)}</p>
            <p className="mt-0.5 flex items-center gap-2 text-sm">
              <Change pct={s.changePct} />
              <span className="text-ink-3">{s.change === null ? '' : `${s.change > 0 ? '+' : ''}${rupees(s.change)} today`}</span>
            </p>
          </div>
          <DataNotice asOf={s.asOf} className="max-w-sm" />
        </section>

        <section aria-label="Today's trading" className="raised rounded-2xl bg-surface p-5 shadow-raise-1">
          <h2 className="font-wide font-semibold">Today&apos;s trading</h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Open">{rupees(s.open)}</Stat>
            <Stat label="Day high">{rupees(s.high)}</Stat>
            <Stat label="Day low">{rupees(s.low)}</Stat>
            <Stat label="Previous close">{rupees(s.prevClose)}</Stat>
            <Stat label="Shares traded">{integer(s.volume)}</Stat>
            <Stat label="Value traded">{crore(s.valueCr)}</Stat>
          </dl>
        </section>

        <Panel title="Price change over time" subtitle="Closing prices, compared with the same stock on earlier trading days.">
          <ReturnsTable rows={s.returns} caption="Price change over time" />
          <p className="mt-4 text-[0.8125rem] leading-relaxed text-ink-3">{s.note}</p>
          <p className="mt-1 text-[0.8125rem] text-ink-3">Past performance does not predict future returns.</p>
        </Panel>

        <p className="text-sm text-ink-2">
          Not sure what these numbers mean? <Link to="/learn/reading-a-stock-page" className="font-semibold text-brand hover:underline">Read how to read a stock page</Link>.
        </p>
      </div>
    </>
  );
}
