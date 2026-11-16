import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { COMMUNITY_LIMITS } from '@kosha/shared';
import { useComments, useAddComment, useDeleteComment, useReact } from '../../api/hooks.js';
import { Avatar } from '../../components/ui/Avatar.jsx';
import { Reactions } from '../../components/ui/Reactions.jsx';
import { Button, Segmented, Skeleton, ErrorNote } from '../../components/ui/primitives.jsx';
import { useToast } from '../../components/ui/toast.jsx';
import { timeAgo } from '../../lib/format.js';

const SORTS = [
  { value: 'top', label: 'Top' },
  { value: 'new', label: 'Newest' },
  { value: 'old', label: 'Oldest' },
];

function CommentItem({ comment, onReact, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <li className="flex gap-3 py-4">
      <Avatar user={comment.author} size={32} fallbackClassName="bg-brand-soft text-brand" />
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-semibold">{comment.author.name}</span>
          <span className="text-ink-3"> · {timeAgo(comment.createdAt)}</span>
        </p>
        <p className="mt-1 text-[0.9375rem] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">{comment.body}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1 -ml-2">
          <Reactions likes={comment.likes} dislikes={comment.dislikes} myReaction={comment.myReaction} onChange={(value) => onReact(comment.id, value)} />
          {comment.mine &&
            (confirming ? (
              <span className="ml-2 inline-flex items-center gap-1 text-sm">
                <Button size="sm" variant="danger" onClick={() => onDelete(comment.id)}>
                  Yes, delete
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
              </span>
            ) : (
              <Button size="sm" variant="ghost" aria-label="Delete comment" onClick={() => setConfirming(true)} className="text-ink-3">
                <Trash2 size={14} aria-hidden />
                Delete
              </Button>
            ))}
        </div>
      </div>
    </li>
  );
}

/** Comments on an article or a post: write, read, like or dislike, and delete your own. */
export function CommentThread({ kind, target }) {
  const [sort, setSort] = useState('top');
  const [text, setText] = useState('');
  const toast = useToast();
  const thread = useComments({ kind, target, sort });
  const add = useAddComment();
  const remove = useDeleteComment();
  const react = useReact();

  const items = thread.data?.pages.flatMap((p) => p.items) ?? [];
  const total = thread.data?.pages[0]?.total ?? 0;
  const body = text.trim();

  const submit = (e) => {
    e.preventDefault();
    if (!body) return;
    add.mutate(
      { kind, target, body },
      { onSuccess: () => setText(''), onError: (err) => toast.error(err.message) },
    );
  };

  return (
    <section aria-labelledby={`thread-${target}`} className="mt-8 border-t border-line pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id={`thread-${target}`} className="font-wide text-lg font-semibold">
          Comments ({total})
        </h3>
        <Segmented label="Sort comments" size="sm" value={sort} onChange={setSort} options={SORTS} />
      </div>

      <form onSubmit={submit} className="mt-4">
        <label htmlFor={`comment-${target}`} className="sr-only">
          Add a comment
        </label>
        <textarea
          id={`comment-${target}`}
          value={text}
          maxLength={COMMUNITY_LIMITS.comment}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Share what you think or ask a question"
          className="control min-h-24 w-full rounded-[10px] bg-surface px-3 py-2 text-[0.9375rem] placeholder:text-ink-3"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-md text-[0.8125rem] text-ink-3">
            Be kind and stay on topic. Don&apos;t share personal or financial details, and don&apos;t tell others to buy a specific investment.
          </p>
          <div className="flex items-center gap-3">
            <span className="tabular text-[0.8125rem] text-ink-3">
              {text.length}/{COMMUNITY_LIMITS.comment}
            </span>
            <Button type="submit" size="sm" disabled={!body} loading={add.isPending}>
              Post comment
            </Button>
          </div>
        </div>
      </form>

      {thread.isLoading ? (
        <Skeleton className="mt-5 h-24" />
      ) : thread.error ? (
        <div className="mt-5">
          <ErrorNote error={thread.error} onRetry={thread.refetch} />
        </div>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-2">No comments yet. Start the conversation.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {items.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              onReact={(id, value) => react.mutate({ kind: 'comment', target: id, value })}
              onDelete={(id) =>
                remove.mutate({ id, kind, target }, { onSuccess: () => toast.success('Comment deleted'), onError: (err) => toast.error(err.message) })
              }
            />
          ))}
        </ul>
      )}

      {thread.hasNextPage && (
        <div className="mt-3 flex justify-center">
          <Button variant="secondary" size="sm" loading={thread.isFetchingNextPage} onClick={() => thread.fetchNextPage()}>
            Show more comments
          </Button>
        </div>
      )}
    </section>
  );
}
