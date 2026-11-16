import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import FundsPage from './FundsPage.jsx';

const useTopFunds = vi.fn();
const useFundSearch = vi.fn();

vi.mock('../../api/hooks.js', () => ({
  useFundCategories: () => ({ data: CATEGORIES }),
  useTopFunds: (c) => useTopFunds(c),
  useFundSearch: (q) => useFundSearch(q),
}));

const CATEGORIES = [
  { id: 'index', label: 'Index funds', description: 'Copy the Nifty 50 at low cost.' },
  { id: 'small', label: 'Small cap', description: 'Smaller companies.' },
];
const fund = (code, name, house, returns) => ({
  code, name, house, category: 'Other Scheme - Index Funds', nav: 177.162, navDate: '2026-11-13',
  returns: [
    { period: '1Y', pct: returns[0], annualised: false },
    { period: '3Y', pct: returns[1], annualised: true },
    { period: '5Y', pct: returns[2], annualised: true },
  ],
});
const TOP = {
  category: CATEGORIES[0], rankedBy: '3Y', asOf: '2026-11-13',
  items: [fund(120716, 'UTI Nifty 50 Index Fund - Direct Plan - Growth', 'UTI Mutual Fund', [-2.02, 9.97, 7.81]), fund(147481, 'Young Fund - Direct Plan - Growth', 'Test Mutual Fund', [3.5, null, null])],
  disclaimer: 'Ranked by 3-year annualised return from official NAVs. This is a small sample of widely held direct plans, not the whole market, and not a recommendation. Past performance does not predict future returns.',
};

const renderPage = () => render(<MemoryRouter><FundsPage /></MemoryRouter>);

describe('Mutual funds page', () => {
  beforeEach(() => {
    useTopFunds.mockReset();
    useFundSearch.mockReset();
    useTopFunds.mockReturnValue({ data: TOP, isLoading: false, error: null, refetch: vi.fn() });
    useFundSearch.mockReturnValue({ data: undefined, isFetching: false });
  });

  it('starts on index funds and lets you switch category', async () => {
    renderPage();
    expect(useTopFunds).toHaveBeenLastCalledWith('index');
    const user = userEvent.setup();
    const tabs = screen.getByRole('group', { name: 'Fund categories' });
    expect(within(tabs).getByRole('button', { name: 'Index funds' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(tabs).getByRole('button', { name: 'Small cap' }));
    expect(useTopFunds).toHaveBeenLastCalledWith('small');
    expect(screen.getByText('Smaller companies.')).toBeInTheDocument();
  });

  it('shows 1, 3 and 5 year returns for each fund, best 3-year first, with a dash where history is short', () => {
    renderPage();
    const rows = within(screen.getByRole('table', { name: 'Index funds' })).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('UTI Nifty 50 Index Fund');
    expect(rows[0]).toHaveTextContent('-2.02%');
    expect(rows[0]).toHaveTextContent('+9.97%');
    expect(rows[0]).toHaveTextContent('+7.81%');
    expect(rows[1]).toHaveTextContent('+3.50%');
    expect(rows[1].textContent.match(/–/g)).toHaveLength(2);
    expect(within(rows[0]).getByRole('link', { name: /UTI Nifty 50/ })).toHaveAttribute('href', '/markets/funds/120716');
  });

  it('explains that the list is a sample and not a recommendation', () => {
    renderPage();
    expect(screen.getByText(/not a recommendation/i)).toBeInTheDocument();
    expect(screen.getByText(/ranked by 3-year annualised return/i)).toBeInTheDocument();
  });

  it('searches every fund by name', async () => {
    useFundSearch.mockImplementation((q) => ({ data: q.length >= 2 ? [{ code: 122639, name: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth' }] : undefined, isFetching: false }));
    renderPage();
    await userEvent.setup().type(screen.getByRole('searchbox', { name: 'Search any fund' }), 'parag');
    const results = screen.getByRole('region', { name: 'Search results' });
    expect(within(results).getByRole('link', { name: /Parag Parikh Flexi Cap/ })).toHaveAttribute('href', '/markets/funds/122639');
  });

  it('shows a loading state and the unreachable message', () => {
    useTopFunds.mockReturnValue({ data: undefined, isLoading: true, error: null });
    const { unmount } = renderPage();
    expect(screen.getByRole('status', { name: 'Loading funds' })).toBeInTheDocument();
    unmount();
    useTopFunds.mockReturnValue({ data: undefined, isLoading: false, error: Object.assign(new Error('Market data is not reachable right now. Please try again in a few minutes.'), { status: 503 }), refetch: vi.fn() });
    renderPage();
    expect(screen.getByText(/not reachable/i)).toBeInTheDocument();
  });
});
