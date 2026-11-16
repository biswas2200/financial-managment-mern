import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { usePost, useReact, useDeletePost } from '../../api/hooks.js';
import { Reader } from '../../components/ui/Reader.jsx';
import { Reactions } from '../../components/ui/Reactions.jsx';
import { Avatar } from '../../components/ui/Avatar.jsx';
import { Button, Skeleton } from '../../components/ui/primitives.jsx';
import { useToast } from '../../components/ui/toast.jsx';
import { timeAgo } from '../../lib/format.js';
import { CommentThread } from '../community/CommentThread.jsx';
import { domainLabel } from '../community/domains.js';

/** One discussion post, opened over the list. Its address is /discussions/:id. */
export default function PostReader() {
  const { id } = useParams();
  const { data: post, isLoading, error } = usePost(id);
  const react = useReact();
  const remove = useDeletePost();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [confirming, setConfirming] = useState(false);
  const close = () => navigate({ pathname: '/discussions', search: location.search });

  if (!post) {
    return (
      <Reader open onClose={close} title="Post">
        {isLoading ? (
          <Skeleton className="h-48" />
        ) : (
          <div className="py-10 text-center">
            <p className="font-semibold">{error?.status === 404 ? 'This post no longer exists.' : 'We could not load this post.'}</p>
            <Link to={{ pathname: '/discussions', search: location.search }} className="mt-4 inline-block font-semibold text-brand hover:underline">
              Back to discussions
            </Link>
          </div>
        )}
      </Reader>
    );
  }

  return (
    <Reader open onClose={close} title={post.title} meta={`${domainLabel(post.space)} · ${timeAgo(post.createdAt)}`}>
      <div className="flex items-center gap-3">
        <Avatar user={post.author} size={36} fallbackClassName="bg-brand-soft text-brand" />
        <p className="text-sm font-semibold">{post.author.name}</p>
      </div>
      <p className="mt-4 text-[1.0625rem] leading-[1.7] whitespace-pre-wrap [overflow-wrap:anywhere]">{post.body}</p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3 pl-4">
        <Reactions
          likes={post.likes}
          dislikes={post.dislikes}
          myReaction={post.myReaction}
          onChange={(value) => react.mutate({ kind: 'post', target: post.id, value })}
        />
        {post.mine &&
          (confirming ? (
            <span className="inline-flex items-center gap-1">
              <Button
                size="sm"
                variant="danger"
                loading={remove.isPending}
                onClick={() =>
                  remove.mutate(post.id, {
                    onSuccess: () => {
                      toast.success('Post deleted');
                      close();
                    },
                    onError: (err) => toast.error(err.message),
                  })
                }
              >
                Yes, delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </span>
          ) : (
            <Button size="sm" variant="ghost" aria-label="Delete post" onClick={() => setConfirming(true)} className="text-ink-3">
              <Trash2 size={14} aria-hidden />
              Delete
            </Button>
          ))}
      </div>

      <CommentThread kind="post" target={post.id} />
    </Reader>
  );
}
