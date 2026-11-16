import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import LearnPage from './LearnPage.jsx';
import ArticleReader from './ArticleReader.jsx';

const react = vi.fn();
const openCopilot = vi.fn();
let articlesState;
let articleState;

const summary = (over) => ({
  slug: 'emergency-fund', title: 'Build an emergency fund before you invest a rupee', summary: 'A cash cushion keeps one bad month from becoming years of debt.',
  domain: 'saving', level: 'beginner', readMinutes: 5, updated: '2026-11-01', likes: 3, dislikes: 1, commentCount: 2, myReaction: null, ...over,
});
const LIST = [
  summary(),
  summary({ slug: 'budget-50-30-20', title: 'A budget you can keep', summary: 'Split pay into needs, wants and savings.', readMinutes: 4 }),
  summary({ slug: 'compounding-and-sip', title: 'Compounding and the SIP', summary: 'Returns earn their own returns.', domain: 'investing', level: 'intermediate' }),
  summary({ slug: 'upi-safety', title: 'Using UPI safely', summary: 'A few rules block most scams.', domain: 'safety' }),
];
const DETAIL = {
  ...LIST[0],
  takeaways: ['Aim for three to six months of essential spending.', 'Keep it where you can reach it in a day.', 'Build it first.'],
  body: [
    { type: 'p', text: 'Most money trouble starts with a surprise.' },
    { type: 'h2', text: 'How much is enough?' },
    { type: 'p', text: 'Try <b>three</b> months.' },
  ],
  sources: [{ label: 'RBI Kehta Hai', url: 'https://rbikehtahai.rbi.org.in/' }],
  copilotPrompt: 'How big should my emergency fund be?',
};

vi.mock('../../api/hooks.js', () => ({
  useArticles: () => articlesState,
  useArticle: () => articleState,
  useReact: () => ({ mutate: react, isPending: false }),
}));
vi.mock('../assistant/CopilotDrawer.jsx', () => ({ useCopilot: () => ({ open: openCopilot }) }));
vi.mock('../community/CommentThread.jsx', () => ({ CommentThread: ({ kind, target }) => <div data-testid="thread">{`${kind}:${target}`}</div> }));

function Where() {
  const l = useLocation();
  return <p data-testid="where">{`${l.pathname}${l.search}`}</p>;
}

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="learn" element={<LearnPage />}>
          <Route path=":slug" element={<ArticleReader />} />
        </Route>
      </Routes>
      <Where />
    </MemoryRouter>,
  );

describe('Learn page', () => {
  beforeEach(() => {
    react.mockReset();
    openCopilot.mockReset();
    articlesState = { data: LIST, isLoading: false, error: null, refetch: vi.fn() };
    articleState = { data: DETAIL, isLoading: false, error: null };
  });

  it('groups articles under their domain', () => {
    renderAt('/learn');
    expect(screen.getByRole('heading', { level: 1, name: 'Learn' })).toBeInTheDocument();
    for (const heading of ['Saving', 'Investing', 'Scams & safety']) {
      expect(screen.getByRole('heading', { level: 2, name: heading })).toBeInTheDocument();
    }
    expect(screen.queryByRole('heading', { level: 2, name: 'Tax' })).not.toBeInTheDocument(); // no articles, no section
    const saving = screen.getByRole('heading', { level: 2, name: 'Saving' }).closest('section');
    expect(within(saving).getAllByRole('link')).toHaveLength(2);
  });

  it('shows read time, level and the counts on each card', () => {
    renderAt('/learn');
    const card = screen.getByRole('link', { name: /Build an emergency fund/ }).closest('article');
    expect(card).toHaveTextContent('5 min read');
    expect(card).toHaveTextContent('Beginner');
    expect(card).toHaveTextContent('3 likes');
    expect(card).toHaveTextContent('2 comments');
  });

  it('opens an article from its card', async () => {
    renderAt('/learn');
    await userEvent.setup().click(screen.getByRole('link', { name: /Build an emergency fund/ }));
    expect(screen.getByTestId('where')).toHaveTextContent('/learn/emergency-fund');
    expect(screen.getByRole('dialog', { name: /Build an emergency fund/ })).toBeInTheDocument();
  });

  it('filters by topic and keeps the choice in the address', async () => {
    renderAt('/learn');
    const user = userEvent.setup();
    const topics = screen.getByRole('group', { name: 'Topics' });
    await user.click(within(topics).getByRole('button', { name: /Investing/ }));
    expect(screen.getByTestId('where')).toHaveTextContent('/learn?topic=investing');
    expect(screen.getByText('Compounding and the SIP')).toBeInTheDocument();
    expect(screen.queryByText('Using UPI safely')).not.toBeInTheDocument();
    expect(within(topics).getByRole('button', { name: /Investing/ })).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(topics).getByRole('button', { name: /All/ }));
    expect(screen.getByText('Using UPI safely')).toBeInTheDocument();
  });

  it('starts on the topic named in the address', () => {
    renderAt('/learn?topic=safety');
    expect(screen.getByText('Using UPI safely')).toBeInTheDocument();
    expect(screen.queryByText('Compounding and the SIP')).not.toBeInTheDocument();
  });

  it('says plainly that it is general education', () => {
    renderAt('/learn');
    expect(screen.getByText(/general education, not personal advice/i)).toBeInTheDocument();
  });

  it('shows a loading state and an error with a retry', async () => {
    articlesState = { data: undefined, isLoading: true, error: null };
    const { unmount } = renderAt('/learn');
    expect(screen.getByLabelText('Loading articles')).toBeInTheDocument();
    unmount();
    const refetch = vi.fn();
    articlesState = { data: undefined, isLoading: false, error: new Error('Network down'), refetch };
    renderAt('/learn');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('invites you back later when there are no articles', () => {
    articlesState = { data: [], isLoading: false, error: null };
    renderAt('/learn');
    expect(screen.getByText(/no articles/i)).toBeInTheDocument();
  });
});

describe('Article reader', () => {
  beforeEach(() => {
    react.mockReset();
    openCopilot.mockReset();
    articlesState = { data: LIST, isLoading: false, error: null };
    articleState = { data: DETAIL, isLoading: false, error: null };
  });

  it('opens over the list as a dialog with the article, takeaways and sources', () => {
    renderAt('/learn/emergency-fund');
    const dialog = screen.getByRole('dialog', { name: /Build an emergency fund/ });
    expect(within(dialog).getByText('Most money trouble starts with a surprise.')).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'Key takeaways' })).toBeInTheDocument();
    expect(within(dialog).getByText('Keep it where you can reach it in a day.')).toBeInTheDocument();
    expect(within(dialog).getByText(/5 min read/)).toBeInTheDocument();
    const source = within(dialog).getByRole('link', { name: /RBI Kehta Hai/ });
    expect(source).toHaveAttribute('href', 'https://rbikehtahai.rbi.org.in/');
    expect(source).toHaveAttribute('target', '_blank');
    expect(source.getAttribute('rel')).toMatch(/noopener/);
  });

  it('shows article text exactly as written', () => {
    renderAt('/learn/emergency-fund');
    expect(screen.getByText(/Try <b>three<\/b> months\./)).toBeInTheDocument();
  });

  it('lets you like or dislike the article, with separate counts', async () => {
    renderAt('/learn/emergency-fund');
    const user = userEvent.setup();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Like, 3' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Dislike, 1' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Like, 3' }));
    expect(react).toHaveBeenLastCalledWith({ kind: 'article', target: 'emergency-fund', value: 'like' });
    await user.click(within(dialog).getByRole('button', { name: 'Dislike, 1' }));
    expect(react).toHaveBeenLastCalledWith({ kind: 'article', target: 'emergency-fund', value: 'dislike' });
  });

  it('hands Copilot a question about the article', async () => {
    renderAt('/learn/emergency-fund');
    await userEvent.setup().click(screen.getByRole('button', { name: /Ask Copilot about this/ }));
    expect(openCopilot).toHaveBeenCalledWith('How big should my emergency fund be?');
  });

  it('puts the comments under the article', () => {
    renderAt('/learn/emergency-fund');
    expect(screen.getByTestId('thread')).toHaveTextContent('article:emergency-fund');
  });

  it('closes back to the list, keeping the topic you were on', async () => {
    renderAt('/learn/emergency-fund?topic=saving');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/learn?topic=saving');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('says so when the article is not there, and offers the way back', () => {
    articleState = { data: undefined, isLoading: false, error: Object.assign(new Error('Article not found'), { status: 404 }) };
    renderAt('/learn/nope');
    expect(screen.getByText(/isn't available/i)).toBeInTheDocument();
  });
});
