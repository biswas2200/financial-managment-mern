import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { useMarketOverview } from '../../api/hooks.js';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Skeleton } from '../../components/ui/primitives.jsx';
import { crore, level, rupees } from '../../lib/format.js';
import { AskCopilotButton, Change, DataNotice, EXPLAIN_RULES, MarketError } from './parts.jsx';

const DAY_PROMPT = `Summarise how the Indian stock market did on its latest trading day: the Nifty 50, banks, IT, and the biggest movers. ${EXPLAIN_RULES}`;

function IndexCard({ index }) {
  return (
    <Link
      to={`/markets/indices/${encodeURIComponent(index.name)}`}
      className="raised flex flex-col gap-1 rounded-2xl bg-surface p-4 shadow-raise-1 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-raise-2"
    >
      <span className="text-sm text-ink-2">{index.name}</span>
      <span className="tabular font-condensed text-[1.75rem] leading-tight font-semibold">{level(index.close)}</span>
      <span className="flex flex-wrap items-center gap-x-3 text-[0.8125rem]">
        <Change pct={index.changePct} />
        {index.pe != null && <span className="text-ink-3">P/E {index.pe}</span>}
      </span>
    </Link>
  );
}

function Breadth({ breadth }) {
  const { advancers, decliners, unchanged, total } = breadth;
  const share = (n) => (total ? `${(n / total) * 100}%` : '0%');
  return (
    <section aria-labelledby="breadth" className="raised rounded-2xl bg-surface p-5 shadow-raise-1">
      <h2 id="breadth" className="font-wide font-semibold">How wide was the move?</h2>
      <p className="mt-0.5 text-sm text-ink-2">Every stock on the NSE, compared with its previous close.</p>
      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <span style={{ width: share(advancers) }} className="bg-income" />
        <span style={{ width: share(unchanged) }} className="bg-line-strong" />
        <span style={{ width: share(decliners) }} className="bg-bad" />
      </div>
      <p className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span><strong className="tabular text-income-text">{advancers.toLocaleString('en-IN')}</strong> <span className="text-ink-2">advancing</span></span>
        <span><strong className="tabular text-bad-text">{decliners.toLocaleString('en-IN')}</strong> <span className="text-ink-2">declining</span></span>
        <span><strong className="tabular text-ink-2">{unchanged.toLocaleString('en-IN')}</strong> <span className="text-ink-2">unchanged</span></span>
      </p>
    </section>
  );
}

function StockList({ title, items, showValue = false }) {
  const id = `list-${title.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <section aria-labelledby={id} className="raised rounded-2xl bg-surface p-5 shadow-raise-1">
      <h2 id={id} className="font-wide font-semibold">{title}</h2>
      <ul className="mt-2 divide-y divide-line">
        {items.length === 0 && <li className="py-3 text-sm text-ink-3">None today.</li>}
        {items.map((s) => (
          <li key={s.symbol}>
            <Link to={`/markets/stocks/${encodeURIComponent(s.symbol)}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-brand">
              <span className="min-w-0">
                <span className="block truncate text-[0.9375rem] font-semibold">{s.symbol}</span>
                <span className="block truncate text-[0.8125rem] text-ink-3">{s.name}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="tabular block text-[0.9375rem]">{showValue ? crore(s.valueCr) : rupees(s.close)}</span>
                <span className="block text-[0.8125rem]">
                  {showValue ? <span className="text-ink-3">{rupees(s.close)}</span> : <Change pct={s.changePct} />}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Sectors({ sectors }) {
  const biggest = Math.max(0.5, ...sectors.map((s) => Math.abs(s.changePct ?? 0)));
  return (
    <section aria-labelledby="sectors" className="raised rounded-2xl bg-surface p-5 shadow-raise-1">
      <h2 id="sectors" className="font-wide font-semibold">Sectors</h2>
      <p className="mt-0.5 text-sm text-ink-2">Sector indices on the day, best first.</p>
      <ul className="mt-3 flex flex-col gap-2">
        {sectors.map((s) => (
          <li key={s.name} className="grid grid-cols-[minmax(0,10rem)_1fr_4.5rem] items-center gap-3 text-sm max-sm:grid-cols-[minmax(0,8rem)_1fr_4.5rem]">
            <span className="truncate">{s.name}</span>
            <span aria-hidden className="relative h-2 rounded-full bg-surface-2">
              <span
                className={`absolute inset-y-0 rounded-full ${s.changePct >= 0 ? 'left-1/2 bg-income' : 'right-1/2 bg-bad'}`}
                style={{ width: `${(Math.abs(s.changePct ?? 0) / biggest) * 50}%` }}
              />
              <span className="absolute inset-y-[-2px] left-1/2 w-px bg-line-strong" />
            </span>
            <span className="text-right"><Change pct={s.changePct} /></span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function MarketsPage() {
  const { data, isLoading, error, refetch } = useMarketOverview();

  return (
    <>
      <PageHeader
        title="Markets"
        description="How the Indian market did on its latest trading day, with the terms explained. Look, learn, and do your own research."
        actions={<AskCopilotButton label="Ask Copilot to explain the day" prompt={DAY_PROMPT} />}
      />

      {isLoading ? (
        <div role="status" aria-label="Loading market data" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : error ? (
        <MarketError error={error} onRetry={refetch} />
      ) : (
        <div className="flex flex-col gap-5">
          <DataNotice asOf={data.asOf} />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.indices.map((i) => <IndexCard key={i.name} index={i} />)}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Breadth breadth={data.breadth} />
            <Sectors sectors={data.sectors} />
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <StockList title="Top gainers" items={data.gainers} />
            <StockList title="Top losers" items={data.losers} />
            <StockList title="Most traded" items={data.mostActive} showValue />
          </div>
          <p className="-mt-2 text-[0.8125rem] text-ink-3">Gainers, losers and most traded cover the Nifty 50 companies.</p>

          <Link
            to="/learn/nifty-sensex-basics"
            className="raised flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-raise-1 hover:bg-surface-2"
          >
            <BookOpen size={20} aria-hidden className="text-brand" />
            <span>
              <span className="block font-semibold">New to the market?</span>
              <span className="text-sm text-ink-2">Read: Nifty, Sensex and the exchanges</span>
            </span>
          </Link>
        </div>
      )}
    </>
  );
}
