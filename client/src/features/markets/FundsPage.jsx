import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Search } from 'lucide-react';
import { useFundCategories, useTopFunds, useFundSearch } from '../../api/hooks.js';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Skeleton } from '../../components/ui/primitives.jsx';
import { rupees, dateLong } from '../../lib/format.js';
import { Change, MarketError } from './parts.jsx';

function FundSearch() {
  const [q, setQ] = useState('');
  const text = q.trim();
  const search = useFundSearch(text);
  return (
    <div className="mb-6">
      <label htmlFor="fund-search" className="sr-only">Search any fund</label>
      <div className="control-wrap relative flex items-center rounded-xl bg-surface">
        <Search size={18} aria-hidden className="pointer-events-none absolute left-3.5 text-ink-3" />
        <input
          id="fund-search"
          type="search"
          role="searchbox"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search any mutual fund by name"
          autoComplete="off"
          className="h-12 w-full rounded-xl bg-transparent pr-3 pl-11 text-[0.9375rem] placeholder:text-ink-3 focus:outline-none"
        />
      </div>
      {text.length > 0 && text.length < 2 && <p className="mt-2 text-sm text-ink-3">Type at least 2 letters.</p>}
      {text.length >= 2 && search.data && (
        <section aria-label="Search results" className="raised mt-2 overflow-hidden rounded-xl bg-surface shadow-raise-1">
          {search.data.length === 0 ? (
            <p className="px-4 py-3 text-sm text-ink-2">No fund matches “{text}”.</p>
          ) : (
            <ul className="divide-y divide-line">
              {search.data.map((f) => (
                <li key={f.code}>
                  <Link to={`/markets/funds/${f.code}`} className="block px-4 py-2.5 text-[0.9375rem] hover:bg-surface-2">
                    {f.name}
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

export default function FundsPage() {
  const { data: categories = [] } = useFundCategories();
  const [category, setCategory] = useState('index');
  const top = useTopFunds(category);
  const current = categories.find((c) => c.id === category);

  return (
    <>
      <PageHeader
        title="Mutual funds"
        description="Compare how funds have done over 1, 3 and 5 years, and look up any scheme. Past returns are history, not a promise."
      />
      <FundSearch />

      <div role="group" aria-label="Fund categories" className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={category === c.id}
            onClick={() => setCategory(c.id)}
            className={clsx(
              'inline-flex shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-[background-color,color,transform] duration-200 active:scale-95',
              category === c.id ? 'bg-ink text-paper' : 'bg-surface text-ink-2 shadow-raise-1 hover:text-ink',
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      {current && <p className="mb-4 text-sm text-ink-2">{current.description}</p>}

      {top.isLoading ? (
        <div role="status" aria-label="Loading funds">
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : !top.data ? (
        <MarketError error={top.error} onRetry={top.refetch} />
      ) : (
        <section className="raised rounded-2xl bg-surface shadow-raise-1">
          <div className="overflow-x-auto">
            <table aria-label={current?.label ?? 'Funds'} className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-2">
                  <th scope="col" className="px-5 py-2.5 font-medium">Fund</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">NAV</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">1 year</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">3 years a year</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">5 years a year</th>
                </tr>
              </thead>
              <tbody>
                {top.data.items.map((f) => (
                  <tr key={f.code} className="border-b border-line/60 last:border-0 hover:bg-surface-2">
                    <td className="px-5 py-3">
                      <Link to={`/markets/funds/${f.code}`} className="block hover:text-brand">
                        <span className="block font-semibold">{f.name}</span>
                        <span className="block text-[0.8125rem] text-ink-3">{f.house}</span>
                      </Link>
                    </td>
                    <td className="tabular px-3 py-3 text-right">{rupees(f.nav, { decimals: 4 })}</td>
                    {f.returns.map((r, idx) => (
                      <td key={r.period} className={clsx('px-3 py-3 text-right', idx === 2 && 'pr-5')}>
                        <Change pct={r.pct} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line p-4 text-[0.8125rem] leading-relaxed text-ink-3 sm:px-5">
            <p>{top.data.disclaimer}</p>
            {top.data.asOf && <p className="mt-1">NAVs up to {dateLong(top.data.asOf)}. Mutual fund investments are subject to market risks. Read all scheme-related documents carefully.</p>}
          </div>
        </section>
      )}
    </>
  );
}
