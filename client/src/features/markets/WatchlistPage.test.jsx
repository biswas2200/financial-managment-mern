import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../../components/ui/toast.jsx';
import WatchlistPage from './WatchlistPage.jsx';

const remove = vi.fn();
let list;

vi.mock('../../api/hooks.js', () => ({ useWatchlist: () => list, useRemoveWatch: () => ({ mutate: remove, isPending: false }) }));

const ITEMS = [
  { id: 'w1', kind: 'stock', ref: 'RELIANCE', label: 'RELIANCE INDUSTRIES LTD', price: 1339.7, changePct: 1.49, asOf: '2026-11-13' },
  { id: 'w2', kind: 'index', ref: 'Nifty 50', label: 'Nifty 50', price: 25144.3, changePct: -0.61, asOf: '2026-11-13' },
  { id: 'w3', kind: 'fund', ref: '120716', label: 'UTI Nifty 50 Index Fund - Direct Plan - Growth', price: 177.162, changePct: 0.2, asOf: '2026-11-13' },
  { id: 'w4', kind: 'stock', ref: 'TCS', label: 'TATA CONSULTANCY SERVICES LTD', price: null, changePct: null, asOf: null },
];

const renderPage = () => render(<MemoryRouter><ToastProvider><WatchlistPage /></ToastProvider></MemoryRouter>);

describe('Watchlist page', () => {
  beforeEach(() => {
    remove.mockReset();
    list = { data: { items: ITEMS }, isLoading: false, error: null, refetch: vi.fn() };
  });

  it('lists stocks, indices and funds with the latest figure and move, each linking to its page', () => {
    renderPage();
    const rows = within(screen.getByRole('list', { name: 'Your watchlist' })).getAllByRole('listitem');
    expect(rows).toHaveLength(4);
    expect(within(rows[0]).getByRole('link', { name: /RELIANCE INDUSTRIES/ })).toHaveAttribute('href', '/markets/stocks/RELIANCE');
    expect(rows[0]).toHaveTextContent('₹1,339.70');
    expect(rows[0]).toHaveTextContent('+1.49%');
    expect(within(rows[1]).getByRole('link', { name: /Nifty 50/ })).toHaveAttribute('href', '/markets/indices/Nifty%2050');
    expect(rows[1]).toHaveTextContent('25,144.30');
    expect(within(rows[2]).getByRole('link', { name: /UTI Nifty 50/ })).toHaveAttribute('href', '/markets/funds/120716');
    expect(rows[2]).toHaveTextContent('₹177.1620');
  });

  it('still shows an entry whose figures could not be fetched, without inventing any', () => {
    renderPage();
    const row = screen.getByRole('link', { name: /TATA CONSULTANCY/ }).closest('li');
    expect(row).toHaveTextContent('Figures unavailable');
    expect(row).not.toHaveTextContent('₹');
  });

  it('removes an entry', async () => {
    renderPage();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Remove RELIANCE INDUSTRIES LTD from watchlist' }));
    expect(remove.mock.calls[0][0]).toBe('w1');
  });

  it('invites you to add something when it is empty', () => {
    list = { data: { items: [] }, isLoading: false, error: null };
    renderPage();
    expect(screen.getByText(/nothing on your watchlist yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse stocks' })).toHaveAttribute('href', '/markets/stocks');
    expect(screen.getByRole('link', { name: 'Browse mutual funds' })).toHaveAttribute('href', '/markets/funds');
  });

  it('shows a loading state', () => {
    list = { data: undefined, isLoading: true, error: null };
    renderPage();
    expect(screen.getByRole('status', { name: 'Loading watchlist' })).toBeInTheDocument();
  });
});
