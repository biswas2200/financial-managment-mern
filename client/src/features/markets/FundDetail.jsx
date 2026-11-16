import { Link, useParams } from 'react-router-dom';
import { useFund } from '../../api/hooks.js';
import { Panel } from '../../components/ui/Panel.jsx';
import { Skeleton } from '../../components/ui/primitives.jsx';
import { rupees, dateLong } from '../../lib/format.js';
import { AskCopilotButton, BackLink, Change, EXPLAIN_RULES, MarketError, ReturnsTable, WatchButton } from './parts.jsx';
import { NavChart } from './NavChart.jsx';

export default function FundDetail() {
  const { code } = useParams();
  const { data: f, isLoading, error, refetch } = useFund(code);

  if (isLoading) {
    return (
      <>
        <BackLink to="/markets/funds">Back to mutual funds</BackLink>
        <Skeleton className="h-72 rounded-2xl" />
      </>
    );
  }
  if (error || !f) {
    return (
      <>
        <BackLink to="/markets/funds">Back to mutual funds</BackLink>
        <MarketError error={error} onRetry={error?.status === 404 ? undefined : refetch} />
      </>
    );
  }

  const prompt = `Tell me about the mutual fund ${f.name}: its category, what its returns over 1, 3 and 5 years say, and how bumpy it has been. ${EXPLAIN_RULES}`;
  const tableRows = [...f.history].reverse().map((p) => ({ key: p.day, day: dateLong(p.day), nav: rupees(p.nav, { decimals: 4 }) }));
  const returnRows = f.returns;

  return (
    <>
      <BackLink to="/markets/funds">Back to mutual funds</BackLink>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-wide text-[1.5rem] leading-tight font-semibold sm:text-[2rem]">{f.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
            <span>{f.house}</span>
            <span>{f.category}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <WatchButton kind="fund" refId={String(f.code)} />
          <AskCopilotButton label="Ask Copilot about this fund" prompt={prompt} />
        </div>
      </header>

      <div className="flex flex-col gap-5">
        <section className="raised rounded-2xl bg-surface p-5 shadow-raise-1">
          <p className="text-sm text-ink-2">NAV of {dateLong(f.navDate)}</p>
          <p className="tabular font-condensed text-[2.5rem] leading-tight font-semibold">{rupees(f.nav, { decimals: 4 })}</p>
          <p className="mt-1 max-w-xl text-[0.8125rem] text-ink-3">NAV is the price of one unit of the fund, worked out once a day after the market closes.</p>
        </section>

        <Panel
          title="NAV over the last five years"
          table={{
            caption: 'NAV history',
            columns: [
              { key: 'day', label: 'Date' },
              { key: 'nav', label: 'NAV', align: 'right' },
            ],
            rows: tableRows,
          }}
        >
          <NavChart history={f.history} />
        </Panel>

        <Panel title="Returns" subtitle="Up to one year this is the plain change. Beyond a year it is a yearly rate.">
          <ReturnsTable rows={returnRows} caption="Fund returns" />
          {f.sinceLaunch && (
            <p className="mt-3 flex flex-wrap items-center gap-x-2 border-t border-line pt-3 text-sm">
              <span className="font-medium">Since launch ({dateLong(f.sinceLaunch.since)})</span>
              <Change pct={f.sinceLaunch.pct} />
              <span className="text-ink-3">a year, over {f.sinceLaunch.years} years</span>
            </p>
          )}
        </Panel>

        <section aria-labelledby="bumpy" className="raised rounded-2xl bg-surface p-5 shadow-raise-1">
          <h2 id="bumpy" className="font-wide font-semibold">How bumpy has it been?</h2>
          <ul className="mt-3 flex flex-col gap-2 text-[0.9375rem] leading-relaxed">
            <li>
              It has fallen as much as <strong className="tabular">{f.risk.maxDrawdownPct}%</strong> from a peak before recovering.
            </li>
            {f.risk.positiveYearShare !== null && (
              <li>
                In <strong className="tabular">{f.risk.positiveYearShare}%</strong> of one-year periods since launch, the fund ended higher than it started.
              </li>
            )}
          </ul>
        </section>

        <p className="text-[0.8125rem] leading-relaxed text-ink-3">
          {f.note} Mutual fund investments are subject to market risks. Read all scheme-related documents carefully.
        </p>
        <p className="text-sm text-ink-2">
          Want to know what NAV and expense ratio mean? <Link to="/learn/mutual-fund-basics" className="font-semibold text-brand hover:underline">Read the mutual fund basics</Link>.
        </p>
      </div>
    </>
  );
}
