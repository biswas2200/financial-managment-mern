import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../../components/ui/toast.jsx';
import IndexDetail from './IndexDetail.jsx';

const openCopilot = vi.fn();
const add = vi.fn();
let index;

vi.mock('../../api/hooks.js', () => ({
  useIndexDetail: () => index,
  useWatchlist: () => ({ data: { items: [] } }),
  useAddWatch: () => ({ mutate: add, isPending: false }),
  useRemoveWatch: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../assistant/CopilotDrawer.jsx', () => ({ useCopilot: () => ({ open: openCopilot }) }));

const DATA = {
  name: 'Nifty 50', asOf: '2026-11-13', close: 25144.3, change: -155.05, changePct: -0.61, open: 25209.85, high: 25246.35, low: 25054.4, pe: 20.49, pb: 3.08, dividendYield: 1.4,
  returns: [
    { period: '1M', label: '1 month', pct: 10.66, annualised: false, from: '2026-10-13' },
    { period: '1Y', label: '1 year', pct: -2.84, annualised: false, from: '2025-11-13' },
    { period: '3Y', label: '3 years', pct: 8.95, annualised: true, from: '2023-11-13' },
    { period: '5Y', label: '5 years', pct: null, annualised: true, from: null },
  ],
  note: 'End-of-day index levels from the NSE. Returns are price returns and leave out dividends. Not live, and not investment advice.',
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/markets/indices/Nifty%2050']}>
      <ToastProvider>
        <Routes>
          <Route path="markets/indices/:name" element={<IndexDetail />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );

describe('Index page', () => {
  beforeEach(() => {
    openCopilot.mockReset();
    add.mockReset();
    index = { data: DATA, isLoading: false, error: null, refetch: vi.fn() };
  });

  it('shows the level, the move and the valuation with a plain explanation of each term', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Nifty 50' })).toBeInTheDocument();
    expect(screen.getByText('25,144.30')).toBeInTheDocument();
    expect(screen.getByText('-0.61%').closest('[data-trend]')).toHaveAttribute('data-trend', 'down');
    const valuation = screen.getByRole('region', { name: 'Valuation' });
    expect(valuation).toHaveTextContent('20.49');
    expect(valuation).toHaveTextContent('3.08');
    expect(valuation).toHaveTextContent('1.40%');
    expect(valuation).toHaveTextContent(/price divided by earnings/i);
  });

  it('marks returns over a year as annualised', () => {
    renderPage();
    const rows = within(screen.getByRole('table', { name: 'Index returns' })).getAllByRole('row').slice(1);
    expect(rows[1]).toHaveTextContent('-2.84%');
    expect(rows[2]).toHaveTextContent('+8.95%');
    expect(rows[2]).toHaveTextContent(/a year/i);
    expect(rows[1]).not.toHaveTextContent(/a year/i);
    expect(rows[3]).toHaveTextContent('–');
  });

  it('can be watched and explained by Copilot', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Add to watchlist' }));
    expect(add.mock.calls[0][0]).toEqual({ kind: 'index', ref: 'Nifty 50' });
    await user.click(screen.getByRole('button', { name: /Ask Copilot about this index/ }));
    expect(openCopilot.mock.calls[0][0]).toMatch(/Nifty 50/);
  });

  it('says when the index is not found', () => {
    index = { data: undefined, isLoading: false, error: Object.assign(new Error('We could not find that index.'), { status: 404 }), refetch: vi.fn() };
    renderPage();
    expect(screen.getByText(/could not find that index/i)).toBeInTheDocument();
  });
});
