import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { TrendingUp, TriangleAlert, CircleAlert, Info, MessageCircle } from 'lucide-react';
import { useInsights } from '../../api/hooks.js';
import { Skeleton } from '../../components/ui/primitives.jsx';

const TONES = {
  positive: { Icon: TrendingUp, cls: 'bg-good/12 text-good-text', label: 'Good news' },
  neutral: { Icon: Info, cls: 'bg-brand-soft text-brand', label: 'Note' },
  warning: { Icon: TriangleAlert, cls: 'bg-warn/18 text-warn-text', label: 'Heads up' },
  negative: { Icon: CircleAlert, cls: 'bg-bad/12 text-bad-text', label: 'Needs attention' },
};

/** "What stands out": rule-based observations about this month. */
export function Insights({ className }) {
  const { data, isLoading } = useInsights();
  return (
    <section className={clsx('flex flex-col rounded-[22px] bg-surface p-5 ring-1 ring-line sm:p-6', className)}>
      <h2 className="font-wide text-[1.0625rem] font-semibold">What stands out this month</h2>
      <ul className="mt-4 flex flex-1 flex-col gap-4">
        {isLoading &&
          Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </li>
          ))}
        {data?.items?.map((item) => {
          const tone = TONES[item.tone] ?? TONES.neutral;
          return (
            <li key={item.id} className="flex gap-3">
              <span className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', tone.cls)}>
                <tone.Icon size={16} aria-label={tone.label} />
              </span>
              <div className="min-w-0">
                <p className="text-[0.9375rem] leading-snug font-semibold">{item.title}</p>
                <p className="mt-0.5 text-sm text-ink-2">{item.body}</p>
              </div>
            </li>
          );
        })}
        {data && !data.items?.length && <li className="text-sm text-ink-2">Add a few transactions and observations will show up here.</li>}
      </ul>
      <Link
        to="/copilot"
        className="mt-5 inline-flex items-center gap-2 self-start rounded-lg text-sm font-semibold text-brand hover:underline"
      >
        <MessageCircle size={16} aria-hidden />
        Ask Copilot about your month
      </Link>
    </section>
  );
}
