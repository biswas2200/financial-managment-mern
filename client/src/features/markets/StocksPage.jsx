import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useNifty50, useStockSearch } from '../../api/hooks.js';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Segmented, Skeleton } from '../../components/ui/primitives.jsx';
import { rupees } from '../../lib/format.js';
import { Change, DataNotice, MarketError } from './parts.jsx';

const SORTS = [
  { value: 'name', label: 'A to Z' },
  { value: 'gain', label: 'Biggest gain' },
  { value: 'fall', label: 'Biggest fall' },
];

const compare = {
  name: (a, b) => a.name.localeCompare(b.name),
  gain: (a, b) => (b.changePct ?? -Infinity) - (a.changePct ?? -Infinity),
  fall: (a, b) => (a.changePct ?? Infinity) - (b.changePct ?? Infinity),
};

function SearchBox() {
  const [q, setQ] = useState('');
  const text = q.trim();
  const search = useStockSearch(text);
  return (
    <div className="mb-6">
      <label htmlFor="stock-search" className="sr-only">Search stocks</label>
      <div className="control-wrap relative flex items-center rounded-xl bg-surface">
        <Search size={18} aria-hidden className="pointer-events-none absolute left-3.5 text-ink-3" />
        <input
          id="stock-search"
          type="search"
          role="searchbox"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search any NSE stock by name or symbol"
          autoComplete="off"
          className="h-12 w-full rounded-xl bg-transparent pr-3 pl-11 text-[0.9375rem] placeholder:text-ink-3 focus:outline-none"
        />
      </div>
      {text.length > 0 && text.length < 2 && <p className="mt-2 text-sm text-ink-3">Type at least 2 letters.</p>}
      {text.length >= 2 && search.data && (
        <section aria-label="Search results" className="raised mt-2 overflow-hidden rounded-xl bg-surface shadow-raise-1">
          {search.data.length === 0 ? (
            <p className="px-4 py-3 text-sm text-ink-2">No stock matches “{text}”.</p>
          ) : (
            <ul className="divide-y divide-line">
              {search.data.map((s) => (
                <li key={s.symbol}>
                  <Link to={`/markets/stocks/${encodeURIComponent(s.symbol)}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-surface-2">
                    <span className="min-w-0">
                      <span className="font-semibold">{s.symbol}</span>
                      <span className="ml-2 text-sm text-ink-2">{s.name}</span>
                    </span>
                    {s.industry && <span className="hidden shrink-0 text-[0.8125rem] text-ink-3 sm:block">{s.industry}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

export default function StocksPage() {
  const { data, isLoading, error, refetch } = useNifty50();
  const [sort, setSort] = useState('name');
  const rows = useMemo(() => [...(data?.items ?? [])].sort(compare[sort]), [data, sort]);

  return (
    <>
      <PageHeader title="Stocks" description="Search any company listed on the NSE, or browse the Nifty 50: the 50 largest, most traded companies." />
      <SearchBox />

      {isLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : !data ? (
        <MarketError error={error} onRetry={refetch} />
      ) : (
        <section className="raised rounded-2xl bg-surface shadow-raise-1">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 sm:px-5">
            <div>
              <h2 className="font-wide font-semibold">Nifty 50</h2>
              <DataNotice asOf={data.asOf} className="mt-1" />
            </div>
            <Segmented label="Sort the Nifty 50" size="sm" value={sort} onChange={setSort} options={SORTS} />
          </div>
          <div className="overflow-x-auto">
            <table aria-label="Nifty 50" className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-2">
                  <th scope="col" className="px-5 py-2.5 font-medium">Company</th>
                  <th scope="col" className="hidden px-3 py-2.5 font-medium md:table-cell">Industry</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Close</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Change</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.symbol} className="border-b border-line/60 last:border-0 hover:bg-surface-2">
                    <td className="px-5 py-2.5">
                      <Link to={`/markets/stocks/${encodeURIComponent(s.symbol)}`} className="block min-w-0 hover:text-brand">
                        <span className="block truncate font-semibold">{s.name}</span>
                        <span className="block text-[0.8125rem] text-ink-3">{s.symbol}</span>
                      </Link>
                    </td>
                    <td className="hidden px-3 py-2.5 text-ink-2 md:table-cell">{s.industry}</td>
                    <td className="tabular px-3 py-2.5 text-right">{rupees(s.close)}</td>
                    <td className="px-5 py-2.5 text-right"><Change pct={s.changePct} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
