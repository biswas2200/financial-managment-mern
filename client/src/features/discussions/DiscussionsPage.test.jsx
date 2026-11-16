import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ToastProvider } from '../../components/ui/toast.jsx';
import DiscussionsPage from './DiscussionsPage.jsx';
import PostReader from './PostReader.jsx';

const usePosts = vi.fn();
const createPost = vi.fn();
const deletePost = vi.fn();
const react = vi.fn();
const fetchNextPage = vi.fn();
let postState;
let singleState;

const post = (over = {}) => ({
  id: 'p1', space: 'stocks', title: 'How do I read a P/E ratio?', body: 'I keep seeing P/E on every stock page. What is a sensible way to read it?',
  createdAt: new Date().toISOString(), author: { name: 'Aarav M.', avatar: null }, likes: 5, dislikes: 2, myReaction: null, commentCount: 3, mine: false, ...over,
});

vi.mock('../../api/hooks.js', () => ({
  usePosts: (args) => usePosts(args),
  usePost: () => singleState,
  useCreatePost: () => ({ mutate: createPost, isPending: false }),
  useDeletePost: () => ({ mutate: deletePost, isPending: false }),
  useReact: () => ({ mutate: react, isPending: false }),
}));
vi.mock('../community/CommentThread.jsx', () => ({ CommentThread: ({ kind, target }) => <div data-testid="thread">{`${kind}:${target}`}</div> }));

function Where() {
  const l = useLocation();
  return <p data-testid="where">{`${l.pathname}${l.search}`}</p>;
}

const setPosts = (items, extra = {}) => {
  postState = { data: { pages: [{ items, total: items.length, page: 1, pages: 1 }] }, isLoading: false, error: null, hasNextPage: false, isFetchingNextPage: false, fetchNextPage, refetch: vi.fn(), ...extra };
  usePosts.mockReturnValue(postState);
};

const renderAt = (path = '/discussions') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <Routes>
          <Route path="discussions" element={<DiscussionsPage />}>
            <Route path=":id" element={<PostReader />} />
          </Route>
        </Routes>
        <Where />
      </ToastProvider>
    </MemoryRouter>,
  );

describe('Discussions page', () => {
  beforeEach(() => {
    [usePosts, createPost, deletePost, react, fetchNextPage].forEach((m) => m.mockReset());
    setPosts([post(), post({ id: 'p2', space: 'funds', title: 'SIP or lump sum?', author: { name: 'Neha K.', avatar: null }, likes: 0, dislikes: 0, commentCount: 0 })]);
    singleState = { data: post({ mine: true }), isLoading: false, error: null };
  });

  it('lists posts with their space, author, comment count and separate reaction counts', () => {
    renderAt();
    expect(screen.getByRole('heading', { level: 1, name: 'Discussions' })).toBeInTheDocument();
    const card = screen.getByRole('link', { name: 'How do I read a P/E ratio?' }).closest('article');
    expect(card).toHaveTextContent('Stocks');
    expect(card).toHaveTextContent('Aarav M.');
    expect(card).toHaveTextContent('3 comments');
    expect(within(card).getByRole('button', { name: 'Like, 5' })).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Dislike, 2' })).toBeInTheDocument();
  });

  it('never shows a negative count on a post', () => {
    setPosts([post({ likes: -2, dislikes: -7 })]);
    renderAt();
    expect(screen.getByRole('button', { name: 'Like, 0' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dislike, 0' })).toBeInTheDocument();
  });

  it('reacts to a post without opening it', async () => {
    renderAt();
    const card = screen.getByRole('link', { name: 'How do I read a P/E ratio?' }).closest('article');
    await userEvent.setup().click(within(card).getByRole('button', { name: 'Like, 5' }));
    expect(react).toHaveBeenLastCalledWith({ kind: 'post', target: 'p1', value: 'like' });
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/discussions$/);
  });

  it('filters by space and sorts by most liked', async () => {
    renderAt();
    expect(usePosts).toHaveBeenLastCalledWith({ space: undefined, sort: 'new' });
    const user = userEvent.setup();
    await user.click(within(screen.getByRole('group', { name: 'Spaces' })).getByRole('button', { name: 'Stocks' }));
    expect(usePosts).toHaveBeenLastCalledWith({ space: 'stocks', sort: 'new' });
    await user.click(screen.getByText('Most liked'));
    expect(usePosts).toHaveBeenLastCalledWith({ space: 'stocks', sort: 'top' });
  });

  it('opens a post in a reader dialog with its comments', async () => {
    renderAt();
    await userEvent.setup().click(screen.getByRole('link', { name: 'How do I read a P/E ratio?' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/discussions/p1');
    const dialog = screen.getByRole('dialog', { name: 'How do I read a P/E ratio?' });
    expect(dialog).toHaveTextContent('I keep seeing P/E on every stock page.');
    expect(within(dialog).getByTestId('thread')).toHaveTextContent('post:p1');
  });

  it('closes the reader back to the list', async () => {
    renderAt('/discussions/p1');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/discussions$/);
  });

  it('lets you delete your own post, after asking', async () => {
    renderAt('/discussions/p1');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Delete post' }));
    expect(deletePost).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Yes, delete' }));
    expect(deletePost.mock.calls[0][0]).toBe('p1');
  });

  it('does not offer Delete on someone else\'s post', () => {
    singleState = { data: post({ mine: false }), isLoading: false, error: null };
    renderAt('/discussions/p1');
    expect(screen.queryByRole('button', { name: 'Delete post' })).not.toBeInTheDocument();
  });

  it('says so when a post is gone', () => {
    singleState = { data: undefined, isLoading: false, error: Object.assign(new Error('gone'), { status: 404 }) };
    renderAt('/discussions/zzz');
    expect(screen.getByText(/no longer exists/i)).toBeInTheDocument();
  });

  it('shows more posts on request', async () => {
    setPosts([post()], { hasNextPage: true });
    renderAt();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Show more posts' }));
    expect(fetchNextPage).toHaveBeenCalled();
  });

  it('invites the first post when there are none', () => {
    setPosts([]);
    renderAt();
    expect(screen.getByText(/no posts yet/i)).toBeInTheDocument();
  });

  it('reminds members that posts are opinions, not advice', () => {
    renderAt();
    expect(screen.getByText(/opinions, not advice/i)).toBeInTheDocument();
  });
});

describe('New post', () => {
  beforeEach(() => {
    [usePosts, createPost].forEach((m) => m.mockReset());
    setPosts([]);
  });

  it('explains what is wrong instead of sending a short post', async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(screen.getAllByRole('button', { name: 'New post' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'New post' });
    await user.type(within(dialog).getByLabelText('Title'), 'Hi');
    await user.click(within(dialog).getByRole('button', { name: 'Post' }));
    expect(await within(dialog).findByText(/title is too short/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/post is required|post is too short/i)).toBeInTheDocument();
    expect(createPost).not.toHaveBeenCalled();
  });

  it('posts a title and text to the chosen space, starting from the space you are viewing', async () => {
    createPost.mockImplementation((_vars, opts) => opts.onSuccess({ id: 'new' }));
    const user = userEvent.setup();
    renderAt();
    await user.click(within(screen.getByRole('group', { name: 'Spaces' })).getByRole('button', { name: 'Mutual funds' }));
    await user.click(screen.getAllByRole('button', { name: 'New post' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'New post' });
    await user.type(within(dialog).getByLabelText('Title'), 'SIP or lump sum for ten years?');
    await user.type(within(dialog).getByLabelText('Your post'), 'I can save 10,000 a month. Which approach do people usually prefer, and why?');
    await user.click(within(dialog).getByRole('button', { name: 'Post' }));
    expect(createPost).toHaveBeenCalledTimes(1);
    expect(createPost.mock.calls[0][0]).toEqual({
      space: 'funds',
      title: 'SIP or lump sum for ten years?',
      body: 'I can save 10,000 a month. Which approach do people usually prefer, and why?',
    });
  });

  it('lets you choose a different space', async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(screen.getAllByRole('button', { name: 'New post' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'New post' });
    await user.click(within(dialog).getByRole('combobox', { name: 'Space' }));
    await user.click(screen.getByRole('option', { name: 'Scams & safety' }));
    await user.type(within(dialog).getByLabelText('Title'), 'Got a call about my UPI');
    await user.type(within(dialog).getByLabelText('Your post'), 'Someone said they sent money by mistake and asked me to send it back.');
    await user.click(within(dialog).getByRole('button', { name: 'Post' }));
    expect(createPost.mock.calls[0][0].space).toBe('safety');
  });

  it('warns not to share personal details or give tips', async () => {
    renderAt();
    await userEvent.setup().click(screen.getAllByRole('button', { name: 'New post' })[0]);
    expect(within(screen.getByRole('dialog', { name: 'New post' })).getByText(/personal or financial details/i)).toBeInTheDocument();
  });
});
