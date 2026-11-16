import { Link, Outlet, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { ThumbsUp, ThumbsDown, MessageSquare, Clock } from 'lucide-react';
import { DOMAINS, formatCount } from '@kosha/shared';
import { useArticles } from '../../api/hooks.js';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Skeleton, EmptyState, ErrorNote } from '../../components/ui/primitives.jsx';
import { BLURBS, domainColor, domainLabel } from '../community/domains.js';

const plural = (n, one, many) => `${formatCount(n)} ${Math.floor(Number(n)) === 1 ? one : many}`;
const LEVELS = { beginner: 'Beginner', intermediate: 'Intermediate' };

function ArticleCard({ article, search }) {
  return (
    <article className="raised relative flex flex-col gap-3 rounded-2xl bg-surface p-5 shadow-raise-1 transition-[transform,box-shadow] duration-200 focus-within:ring-2 focus-within:ring-brand hover:-translate-y-0.5 hover:shadow-raise-2">
      <div className="flex items-center gap-2 text-[0.8125rem] text-ink-3">
        <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: domainColor(article.domain) }} />
        <span>{domainLabel(article.domain)}</span>
        <span aria-hidden>·</span>
        <span>{LEVELS[article.level] ?? article.level}</span>
      </div>
      <h3 className="font-wide text-[1.125rem] leading-snug font-semibold text-balance">
        <Link to={{ pathname: `/learn/${article.slug}`, search }} className="outline-none after:absolute after:inset-0 after:rounded-2xl">
          {article.title}
        </Link>
      </h3>
      <p className="text-[0.9375rem] leading-relaxed text-ink-2">{article.summary}</p>
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[0.8125rem] text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <Clock size={14} aria-hidden />
          {article.readMinutes} min read
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ThumbsUp size={14} aria-hidden />
          {plural(article.likes, 'like', 'likes')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ThumbsDown size={14} aria-hidden />
          {plural(article.dislikes, 'dislike', 'dislikes')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MessageSquare size={14} aria-hidden />
          {plural(article.commentCount, 'comment', 'comments')}
        </span>
      </div>
    </article>
  );
}

export default function LearnPage() {
  const { data, isLoading, error, refetch } = useArticles();
  const [params, setParams] = useSearchParams();
  const requested = params.get('topic');
  const topic = DOMAINS.some((d) => d.id === requested) ? requested : null;

  const articles = data ?? [];
  const present = DOMAINS.filter((d) => articles.some((a) => a.domain === d.id));
  const shown = present.filter((d) => !topic || d.id === topic);

  const pick = (id) => {
    const next = new URLSearchParams(params);
    if (id) next.set('topic', id);
    else next.delete('topic');
    setParams(next);
  };
  const search = params.toString() ? `?${params.toString()}` : '';

  return (
    <>
      <PageHeader
        title="Learn"
        description="Plain-language guides on saving, investing and staying safe with money in India. Open one to read it, talk about it, or ask Copilot."
      />

      {isLoading ? (
        <div role="status" aria-label="Loading articles" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorNote error={error} onRetry={refetch} />
      ) : articles.length === 0 ? (
        <section className="raised rounded-2xl bg-surface shadow-raise-1">
          <EmptyState title="No articles yet">Guides on saving and investing will appear here.</EmptyState>
        </section>
      ) : (
        <>
          <div role="group" aria-label="Topics" className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {[{ id: null, label: 'All', count: articles.length }, ...present.map((d) => ({ id: d.id, label: d.label, count: articles.filter((a) => a.domain === d.id).length }))].map(
              (chip) => {
                const active = (topic ?? null) === chip.id;
                return (
                  <button
                    key={chip.label}
                    type="button"
                    aria-pressed={active}
                    onClick={() => pick(chip.id)}
                    className={clsx(
                      'inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-[background-color,color,transform] duration-200 active:scale-95',
                      active ? 'bg-ink text-paper' : 'bg-surface text-ink-2 shadow-raise-1 hover:text-ink',
                    )}
                  >
                    {chip.id && <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: domainColor(chip.id) }} />}
                    {chip.label}
                    <span className={clsx('tabular text-[0.75rem]', active ? 'opacity-70' : 'text-ink-3')}>{chip.count}</span>
                  </button>
                );
              },
            )}
          </div>

          <div className="flex flex-col gap-10">
            {shown.map((d) => (
              <section key={d.id} aria-labelledby={`domain-${d.id}`}>
                <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
                  <h2 id={`domain-${d.id}`} className="font-wide text-xl font-semibold">
                    {d.label}
                  </h2>
                  <p className="text-sm text-ink-2">{BLURBS[d.id]}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {articles
                    .filter((a) => a.domain === d.id)
                    .map((a) => (
                      <ArticleCard key={a.slug} article={a} search={search} />
                    ))}
                </div>
              </section>
            ))}
          </div>

          <p className="mt-10 max-w-2xl text-sm text-ink-3">
            General education, not personal advice. These articles avoid tax rates and product returns that change, and point to official sources instead.
          </p>
        </>
      )}
      <Outlet />
    </>
  );
}
