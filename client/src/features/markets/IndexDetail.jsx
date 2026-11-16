import { Link, useParams } from 'react-router-dom';
import { useIndexDetail } from '../../api/hooks.js';
import { Panel } from '../../components/ui/Panel.jsx';
import { Skeleton } from '../../components/ui/primitives.jsx';
import { level } from '../../lib/format.js';
import { AskCopilotButton, BackLink, Change, DataNotice, EXPLAIN_RULES, MarketError, ReturnsTable, Stat, WatchButton } from './parts.jsx';

export default function IndexDetail() {
  const { name } = useParams();
  const { data: i, isLoading, error, refetch } = useIndexDetail(name);

  if (isLoading) {
    return (
      <>
        <BackLink to="/markets">Back to markets</BackLink>
        <Skeleton className="h-72 rounded-2xl" />
      </>
    );
  }
  if (error || !i) {
    return (
      <>
        <BackLink to="/markets">Back to markets</BackLink>
        <MarketError error={error} onRetry={error?.status === 404 ? undefined : refetch} />
      </>
    );
  }

  const prompt = `Tell me about the ${i.name} index using its latest numbers: level, today's move, P/E, P/B, dividend yield and returns over 1, 3 and 5 years. ${EXPLAIN_RULES}`;
  const pct = (v) => (v === null || v === undefined ? '–' : `${v.toFixed(2)}%`);
  const num = (v) => (v === null || v === undefined ? '–' : v.toFixed(2));

  return (
    <>
      <BackLink to="/markets">Back to markets</BackLink>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <h1 className="font-wide text-[1.75rem] leading-tight font-semibold sm:text-[2.125rem]">{i.name}</h1>
        <div className="flex flex-wrap gap-2">
          <WatchButton kind="index" refId={i.name} />
          <AskCopilotButton label="Ask Copilot about this index" prompt={prompt} />
        </div>
      </header>

      <div className="flex flex-col gap-5">
        <section className="raised flex flex-wrap items-end justify-between gap-4 rounded-2xl bg-surface p-5 shadow-raise-1">
          <div>
            <p className="text-sm text-ink-2">Last close</p>
            <p className="tabular font-condensed text-[2.5rem] leading-tight font-semibold">{level(i.close)}</p>
            <p className="mt-0.5 flex items-center gap-2 text-sm">
              <Change pct={i.changePct} />
              <span className="text-ink-3">{i.change === null ? '' : `${i.change > 0 ? '+' : ''}${level(i.change)} points`}</span>
            </p>
          </div>
          <DataNotice asOf={i.asOf} className="max-w-sm" />
        </section>

        <section aria-label="Valuation" className="raised rounded-2xl bg-surface p-5 shadow-raise-1">
          <h2 className="font-wide font-semibold">Valuation</h2>
          <p className="mt-0.5 text-sm text-ink-2">How much investors are paying for what the companies earn and own.</p>
          <dl className="mt-4 grid gap-5 sm:grid-cols-3">
            <Stat label="P/E" hint="Price divided by earnings: ₹ paid for each ₹1 of yearly profit.">{num(i.pe)}</Stat>
            <Stat label="P/B" hint="Price divided by book value: the price compared with what the companies own after debts.">{num(i.pb)}</Stat>
            <Stat label="Dividend yield" hint="Yearly dividends as a share of the price.">{pct(i.dividendYield)}</Stat>
          </dl>
        </section>

        <Panel title="Index returns" subtitle="Price returns. Dividends are not included.">
          <ReturnsTable rows={i.returns} caption="Index returns" />
          <p className="mt-4 text-[0.8125rem] leading-relaxed text-ink-3">{i.note}</p>
        </Panel>

        <p className="text-sm text-ink-2">
          New to indices? <Link to="/learn/nifty-sensex-basics" className="font-semibold text-brand hover:underline">Read how Nifty and Sensex work</Link>.
        </p>
      </div>
    </>
  );
}
