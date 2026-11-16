import { Link } from 'react-router-dom';
import { Landmark, Star, TrendingUp, X, ChartCandlestick } from 'lucide-react';
import { useWatchlist, useRemoveWatch } from '../../api/hooks.js';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Button, EmptyState, Skeleton } from '../../components/ui/primitives.jsx';
import { useToast } from '../../components/ui/toast.jsx';
import { level, rupees } from '../../lib/format.js';
import { Change, MarketError } from './parts.jsx';

const KINDS = {
  stock: { icon: ChartCandlestick, label: 'Stock', to: (ref) => `/markets/stocks/${encodeURIComponent(ref)}`, price: (p) => rupees(p) },
  index: { icon: TrendingUp, label: 'Index', to: (ref) => `/markets/indices/${encodeURIComponent(ref)}`, price: (p) => level(p) },
  fund: { icon: Landmark, label: 'Fund', to: (ref) => `/markets/funds/${ref}`, price: (p) => rupees(p, { decimals: 4 }) },
};

export default function WatchlistPage() {
  const { data, isLoading, error, refetch } = useWatchlist();
  const remove = useRemoveWatch();
  const toast = useToast();
  const items = data?.items ?? [];

  return (
    <>
      <PageHeader title="Watchlist" description="Stocks, indices and funds you want to keep an eye on, with their latest end-of-day figures." />

      {isLoading ? (
        <div role="status" aria-label="Loading watchlist">
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      ) : !data && error ? (
        <MarketError error={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <section className="raised rounded-2xl bg-surface shadow-raise-1">
          <EmptyState
            icon={<Star size={22} />}
            title="Nothing on your watchlist yet"
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/markets/stocks" className="btn-3d inline-flex h-10 items-center rounded-[10px] bg-brand px-4 text-[0.9375rem] font-semibold text-brand-ink hover:bg-brand-hover">
                  Browse stocks
                </Link>
                <Link to="/markets/funds" className="btn-3d-soft inline-flex h-10 items-center rounded-[10px] bg-surface px-4 text-[0.9375rem] font-semibold hover:bg-surface-2">
                  Browse mutual funds
                </Link>
              </div>
            }
          >
            Open a stock, index or fund and choose Add to watchlist. It is saved to your Kosha account.
          </EmptyState>
        </section>
      ) : (
        <ul aria-label="Your watchlist" className="raised divide-y divide-line rounded-2xl bg-surface shadow-raise-1">
          {items.map((item) => {
            const kind = KINDS[item.kind];
            const Icon = kind.icon;
            return (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                  <Icon size={17} />
                </span>
                <Link to={kind.to(item.ref)} className="min-w-0 flex-1 hover:text-brand">
                  <span className="block truncate font-semibold">{item.label}</span>
                  <span className="block text-[0.8125rem] text-ink-3">{kind.label}</span>
                </Link>
                {item.price === null ? (
                  <span className="text-[0.8125rem] text-ink-3">Figures unavailable</span>
                ) : (
                  <span className="shrink-0 text-right">
                    <span className="tabular block">{kind.price(item.price)}</span>
                    <span className="block text-[0.8125rem]"><Change pct={item.changePct} /></span>
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${item.label} from watchlist`}
                  onClick={() => remove.mutate(item.id, { onSuccess: () => toast.success('Removed from your watchlist'), onError: (e) => toast.error(e.message) })}
                >
                  <X size={16} />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
