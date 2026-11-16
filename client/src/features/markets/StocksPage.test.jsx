import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import StocksPage from './StocksPage.jsx';

const useStockSearch = vi.fn();
let list;

vi.mock('../../api/hooks.js', () => ({ useNifty50: () => list, useStockSearch: (q) => useStockSearch(q) }));

const row = (symbol, name, close, changePct, industry) => ({ symbol, name, close, change: 1, changePct, valueCr: 100, industry });
const ITEMS = [
  row('RELIANCE', 'RELIANCE INDUSTRIES LTD', 1339.7, 1.2, 'Oil Gas & Consumable Fuels'),
  row('TCS', 'TATA CONSULTANCY SERVICES LTD', 3020.5, -0.4, 'Information Technology'),
  row('HDFCBANK', 'HDFC BANK LTD', 1002.3, 0.1, 'Financial Services'),
];

const renderPage = () => render(<MemoryRouter><StocksPage /></MemoryRouter>);
const names = () => within(screen.getByRole('table', { name: 'Nifty 50' })).getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[0].textContent);

describe('Stocks page', () => {
  beforeEach(() => {
    useStockSearch.mockReset();
    useStockSearch.mockReturnValue({ data: undefined, isFetching: false });
    list = { data: { asOf: '2026-11-13', items: ITEMS }, isLoading: false, error: null, refetch: vi.fn() };
  });

  it('lists the Nifty 50 companies with price and move, linking to each one', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Stocks' })).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /RELIANCE INDUSTRIES LTD/ });
    expect(link).toHaveAttribute('href', '/markets/stocks/RELIANCE');
    const rowEl = link.closest('tr');
    expect(rowEl).toHaveTextContent('₹1,339.70');
    expect(rowEl).toHaveTextContent('+1.20%');
    expect(rowEl).toHaveTextContent('Oil Gas & Consumable Fuels');
    expect(screen.getByText(/as of 13 Nov 2026/i)).toBeInTheDocument();
  });

  it('sorts A to Z by default, and by biggest gain or fall on request', async () => {
    renderPage();
    expect(names()[0]).toMatch(/HDFC BANK/);
    const user = userEvent.setup();
    await user.click(screen.getByText('Biggest gain'));
    expect(names().map((n) => n.split(' ')[0])).toEqual(['RELIANCE', 'HDFC', 'TATA']);
    await user.click(screen.getByText('Biggest fall'));
    expect(names()[0]).toMatch(/TATA/);
  });

  it('searches every NSE stock by name or symbol', async () => {
    useStockSearch.mockImplementation((q) => ({ data: q.length >= 2 ? [{ symbol: 'TATAELXSI', name: 'TATA ELXSI LTD', industry: 'Information Technology' }] : undefined, isFetching: false }));
    renderPage();
    await userEvent.setup().type(screen.getByRole('searchbox', { name: 'Search stocks' }), 'tata');
    expect(useStockSearch).toHaveBeenLastCalledWith('tata');
    const results = screen.getByRole('region', { name: 'Search results' });
    expect(within(results).getByRole('link', { name: /TATAELXSI/ })).toHaveAttribute('href', '/markets/stocks/TATAELXSI');
  });

  it('says when nothing matches, and asks for two letters first', async () => {
    useStockSearch.mockImplementation((q) => ({ data: q.length >= 2 ? [] : undefined, isFetching: false }));
    renderPage();
    const user = userEvent.setup();
    await user.type(screen.getByRole('searchbox', { name: 'Search stocks' }), 'z');
    expect(screen.getByText(/at least 2 letters/i)).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Search stocks' }), 'zzz');
    expect(screen.getByText(/no stock matches/i)).toBeInTheDocument();
  });

  it('shows the unreachable message instead of a table', () => {
    list = { data: undefined, isLoading: false, error: Object.assign(new Error('Market data is not reachable right now. Please try again in a few minutes.'), { status: 503 }), refetch: vi.fn() };
    renderPage();
    expect(screen.getByText(/not reachable/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
