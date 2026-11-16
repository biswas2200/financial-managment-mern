import { useState } from 'react';
import { Link, Outlet, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { MessageSquare, MessagesSquare, Plus } from 'lucide-react';
import { SPACES, formatCount } from '@kosha/shared';
import { usePosts, useReact } from '../../api/hooks.js';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { Reactions } from '../../components/ui/Reactions.jsx';
import { Avatar } from '../../components/ui/Avatar.jsx';
import { Button, EmptyState, ErrorNote, Segmented, Skeleton } from '../../components/ui/primitives.jsx';
import { timeAgo } from '../../lib/format.js';
import { domainColor, domainLabel } from '../community/domains.js';
import { NewPostDialog } from './NewPostDialog.jsx';

const SORTS = [
  { value: 'new', label: 'Newest' },
  { value: 'top', label: 'Most liked' },
];

function PostCard({ post, search, onReact }) {
  const excerpt = post.body.length > 190 ? `${post.body.slice(0, 190).trimEnd()}…` : post.body;
  return (
    <article className="raised relative flex flex-col gap-2.5 rounded-2xl bg-surface p-5 shadow-raise-1 transition-[transform,box-shadow] duration-200 focus-within:ring-2 focus-within:ring-brand hover:-translate-y-0.5 hover:shadow-raise-2">
      <div className="flex items-center gap-2 text-[0.8125rem] text-ink-3">
        <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: domainColor(post.space) }} />
        {domainLabel(post.space)}
      </div>
      <h3 className="font-wide text-[1.0625rem] leading-snug font-semibold text-balance">
        <Link to={{ pathname: `/discussions/${post.id}`, search }} className="outline-none after:absolute after:inset-0 after:rounded-2xl">
          {post.title}
        </Link>
      </h3>
      <p className="text-[0.9375rem] leading-relaxed text-ink-2 [overflow-wrap:anywhere]">{excerpt}</p>
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex min-w-0 items-center gap-2 text-[0.8125rem] text-ink-3">
          <Avatar user={post.author} size={22} fallbackClassName="bg-brand-soft text-brand" />
          <span className="truncate">
            <span className="font-medium text-ink-2">{post.author.name}</span> · {timeAgo(post.createdAt)}
          </span>
        </div>
        <div className="relative z-10 -mr-2 flex flex-wrap items-center gap-1">
          <span className="inline-flex items-center gap-1.5 px-2 text-[0.8125rem] text-ink-3">
            <MessageSquare size={14} aria-hidden />
            {formatCount(post.commentCount)} {post.commentCount === 1 ? 'comment' : 'comments'}
          </span>
          <Reactions likes={post.likes} dislikes={post.dislikes} myReaction={post.myReaction} onChange={(value) => onReact(post.id, value)} />
        </div>
      </div>
    </article>
  );
}

export default function DiscussionsPage() {
  const [params, setParams] = useSearchParams();
  const space = SPACES.some((s) => s.id === params.get('space')) ? params.get('space') : undefined;
  const sort = params.get('sort') === 'top' ? 'top' : 'new';
  const [composing, setComposing] = useState(false);

  const posts = usePosts({ space, sort });
  const react = useReact();
  const items = posts.data?.pages.flatMap((p) => p.items) ?? [];
  const search = params.toString() ? `?${params.toString()}` : '';

  const change = (key, value) => {
    const next = new URLSearchParams(params);
    if (value && !(key === 'sort' && value === 'new')) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  return (
    <>
      <PageHeader
        title="Discussions"
        description="Ask questions and compare notes with other Kosha members. Posts and comments are members' opinions, not advice, and Kosha does not check them."
        actions={
          <Button onClick={() => setComposing(true)}>
            <Plus size={18} aria-hidden />
            New post
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Spaces" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {[{ id: undefined, label: 'All' }, ...SPACES].map((s) => {
            const active = space === s.id;
            return (
              <button
                key={s.label}
                type="button"
                aria-pressed={active}
                onClick={() => change('space', s.id)}
                className={clsx(
                  'inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-[background-color,color,transform] duration-200 active:scale-95',
                  active ? 'bg-ink text-paper' : 'bg-surface text-ink-2 shadow-raise-1 hover:text-ink',
                )}
              >
                {s.id && <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: domainColor(s.id) }} />}
                {s.label}
              </button>
            );
          })}
        </div>
        <Segmented label="Sort posts" size="sm" value={sort} onChange={(v) => change('sort', v)} options={SORTS} />
      </div>

      {posts.isLoading ? (
        <div role="status" aria-label="Loading posts" className="grid gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : posts.error ? (
        <ErrorNote error={posts.error} onRetry={posts.refetch} />
      ) : items.length === 0 ? (
        <section className="raised rounded-2xl bg-surface shadow-raise-1">
          <EmptyState
            icon={<MessagesSquare size={22} />}
            title="No posts yet"
            action={<Button onClick={() => setComposing(true)}>Start the first discussion</Button>}
          >
            {space ? `Nobody has posted in ${domainLabel(space)} yet.` : 'Ask a question about saving, investing or staying safe with money.'}
          </EmptyState>
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((p) => (
            <PostCard key={p.id} post={p} search={search} onReact={(id, value) => react.mutate({ kind: 'post', target: id, value })} />
          ))}
        </div>
      )}

      {posts.hasNextPage && (
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" loading={posts.isFetchingNextPage} onClick={() => posts.fetchNextPage()}>
            Show more posts
          </Button>
        </div>
      )}

      <NewPostDialog open={composing} onClose={() => setComposing(false)} defaultSpace={space} />
      <Outlet />
    </>
  );
}
