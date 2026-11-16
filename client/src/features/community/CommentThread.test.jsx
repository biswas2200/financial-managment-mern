import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../../components/ui/toast.jsx';
import { CommentThread } from './CommentThread.jsx';

const addComment = vi.fn();
const deleteComment = vi.fn();
const react = vi.fn();
const fetchNextPage = vi.fn();
const useComments = vi.fn();
let thread;

vi.mock('../../api/hooks.js', () => ({
  useComments: (args) => useComments(args),
  useAddComment: () => ({ mutate: addComment, isPending: false }),
  useDeleteComment: () => ({ mutate: deleteComment, isPending: false }),
  useReact: () => ({ mutate: react, isPending: false }),
}));

const comment = (over = {}) => ({
  id: 'c1', kind: 'article', target: 'emergency-fund', body: 'Very clear, thanks.', createdAt: new Date().toISOString(),
  author: { name: 'Neha K.', avatar: null }, likes: 4, dislikes: 1, myReaction: null, mine: false, ...over,
});

const setThread = (items, extra = {}) => {
  thread = { data: { pages: [{ items, total: items.length, page: 1, pages: 1 }] }, isLoading: false, hasNextPage: false, isFetchingNextPage: false, fetchNextPage, ...extra };
  useComments.mockReturnValue(thread);
};

const renderThread = () =>
  render(
    <MemoryRouter>
      <ToastProvider>
        <CommentThread kind="article" target="emergency-fund" />
      </ToastProvider>
    </MemoryRouter>,
  );

describe('CommentThread', () => {
  beforeEach(() => {
    [addComment, deleteComment, react, fetchNextPage, useComments].forEach((m) => m.mockReset());
    setThread([comment(), comment({ id: 'c2', body: 'I started with one month.', author: { name: 'Aarav M.', avatar: { type: 'preset', preset: 'rocket', color: '#eb6834' } }, likes: 0, dislikes: 0 })]);
  });

  it('lists comments with who wrote them and separate like and dislike counts', () => {
    renderThread();
    expect(screen.getByRole('heading', { name: 'Comments (2)' })).toBeInTheDocument();
    expect(screen.getByText('Very clear, thanks.')).toBeInTheDocument();
    expect(screen.getByText('Neha K.')).toBeInTheDocument();
    const first = screen.getByText('Very clear, thanks.').closest('li');
    expect(within(first).getByRole('button', { name: 'Like, 4' })).toBeInTheDocument();
    expect(within(first).getByRole('button', { name: 'Dislike, 1' })).toBeInTheDocument();
  });

  it('never shows a negative count, even if the data had one', () => {
    setThread([comment({ likes: -3, dislikes: -9 })]);
    renderThread();
    expect(screen.getByRole('button', { name: 'Like, 0' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dislike, 0' })).toBeInTheDocument();
  });

  it('likes and dislikes a comment', async () => {
    const user = userEvent.setup();
    renderThread();
    const first = screen.getByText('Very clear, thanks.').closest('li');
    await user.click(within(first).getByRole('button', { name: 'Like, 4' }));
    expect(react).toHaveBeenLastCalledWith({ kind: 'comment', target: 'c1', value: 'like' });
    await user.click(within(first).getByRole('button', { name: 'Dislike, 1' }));
    expect(react).toHaveBeenLastCalledWith({ kind: 'comment', target: 'c1', value: 'dislike' });
  });

  it('takes a reaction back when you press it again', async () => {
    setThread([comment({ myReaction: 'like' })]);
    renderThread();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Like, 4' }));
    expect(react).toHaveBeenLastCalledWith({ kind: 'comment', target: 'c1', value: null });
  });

  it('posts a comment, and will not post an empty one', async () => {
    const user = userEvent.setup();
    renderThread();
    const send = screen.getByRole('button', { name: 'Post comment' });
    expect(send).toBeDisabled();
    await user.type(screen.getByLabelText('Add a comment'), '  Helpful, thanks  ');
    expect(screen.getByText('19/600')).toBeInTheDocument();
    await user.click(send);
    expect(addComment).toHaveBeenCalledTimes(1);
    expect(addComment.mock.calls[0][0]).toEqual({ kind: 'article', target: 'emergency-fund', body: 'Helpful, thanks' });
  });

  it('limits the comment length and says what not to share', () => {
    renderThread();
    expect(screen.getByLabelText('Add a comment')).toHaveAttribute('maxLength', '600');
    expect(screen.getByText(/don't share personal or financial details/i)).toBeInTheDocument();
  });

  it('clears the box once the comment is saved', async () => {
    addComment.mockImplementation((_vars, opts) => opts.onSuccess());
    const user = userEvent.setup();
    renderThread();
    await user.type(screen.getByLabelText('Add a comment'), 'Thanks');
    await user.click(screen.getByRole('button', { name: 'Post comment' }));
    expect(screen.getByLabelText('Add a comment')).toHaveValue('');
  });

  it('shows Delete only on your own comments, and asks first', async () => {
    setThread([comment({ id: 'mine', body: 'My own comment', mine: true }), comment()]);
    const user = userEvent.setup();
    renderThread();
    expect(screen.getAllByRole('button', { name: 'Delete comment' })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Delete comment' }));
    expect(deleteComment).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Yes, delete' }));
    expect(deleteComment.mock.calls[0][0]).toEqual({ id: 'mine', kind: 'article', target: 'emergency-fund' });
  });

  it('can be sorted by top, newest or oldest', async () => {
    renderThread();
    expect(useComments).toHaveBeenLastCalledWith({ kind: 'article', target: 'emergency-fund', sort: 'top' });
    const user = userEvent.setup();
    await user.click(screen.getByText('Newest'));
    expect(useComments).toHaveBeenLastCalledWith({ kind: 'article', target: 'emergency-fund', sort: 'new' });
    await user.click(screen.getByText('Oldest'));
    expect(useComments).toHaveBeenLastCalledWith({ kind: 'article', target: 'emergency-fund', sort: 'old' });
  });

  it('invites the first comment when there are none', () => {
    setThread([]);
    renderThread();
    expect(screen.getByText(/no comments yet/i)).toBeInTheDocument();
  });

  it('loads more comments on request', async () => {
    setThread([comment()], { hasNextPage: true });
    renderThread();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Show more comments' }));
    expect(fetchNextPage).toHaveBeenCalled();
  });
});
