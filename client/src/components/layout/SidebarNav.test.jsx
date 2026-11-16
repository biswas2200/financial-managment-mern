import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SidebarNav } from './SidebarNav.jsx';

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <SidebarNav />
    </MemoryRouter>,
  );

describe('SidebarNav', () => {
  it('shows each domain with its links', () => {
    renderAt('/');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    for (const heading of ['Money', 'Invest', 'Learn & talk', 'Assistant']) {
      expect(within(nav).getByText(heading)).toBeInTheDocument();
    }
    const invest = within(nav).getByRole('group', { name: 'Invest' });
    expect(within(invest).getByRole('link', { name: 'Markets' })).toHaveAttribute('href', '/markets');
    expect(within(invest).getByRole('link', { name: 'Stocks' })).toHaveAttribute('href', '/markets/stocks');
    expect(within(invest).getByRole('link', { name: 'Mutual funds' })).toHaveAttribute('href', '/markets/funds');
    expect(within(invest).getByRole('link', { name: 'Watchlist' })).toHaveAttribute('href', '/markets/watchlist');
    const learn = within(nav).getByRole('group', { name: 'Learn & talk' });
    expect(within(learn).getByRole('link', { name: 'Learn' })).toHaveAttribute('href', '/learn');
    expect(within(learn).getByRole('link', { name: 'Discussions' })).toHaveAttribute('href', '/discussions');
  });

  it('lights only the page you are on', () => {
    renderAt('/markets/stocks/RELIANCE');
    expect(screen.getByRole('link', { name: 'Stocks' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Markets' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
  });

  it('keeps Learn lit while an article is open', () => {
    renderAt('/learn/emergency-fund');
    expect(screen.getByRole('link', { name: 'Learn' })).toHaveAttribute('aria-current', 'page');
  });

  it('lights Overview only on the home page', () => {
    renderAt('/');
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
  });
});
