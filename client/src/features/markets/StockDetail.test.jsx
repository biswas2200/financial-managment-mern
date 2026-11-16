import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../../components/ui/toast.jsx';
import StockDetail from './StockDetail.jsx';

const openCopilot = vi.fn();
const add = vi.fn();
const remove = vi.fn();
let stock;
let watch;

vi.mock('../../api/hooks.js', () => ({
  useStock: () => stock,
  useWatchlist: () => watch,
  useAddWatch: () => ({ mutate: add, isPending: false }),
  useRemoveWatch: () => ({ mutate: remove, isPending: false }),
}));
vi.mock('../assistant/CopilotDrawer.jsx', () => ({ useCopilot: () => ({ open: openCopilot }) }));

const DATA = {
  symbol: 'RELIANCE', name: 'RELIANCE INDUSTRIES LTD', isin: 'INE002A01018', industry: 'Oil Gas & Consumable Fuels', inNifty50: true, asOf: '2026-11-13',
  close: 1339.7, prevClose: 1320, change: 19.7, changePct: 1.49, open: 1325, high: 1345.5, low: 1318.2, volume: 12_345_678, valueCr: 1840.72,
  returns: [
    { period: '1W', label: '1 week', pct: 1.49, annualised: false, from: '2026-11-06' },
    { period: '1M', label: '1 month', pct: 14.83, annualised: false, from: '2026-10-13' },
    { period: '3M', label: '3 months', pct: 1.72, annualised: false, from: '2026-08-13' },
    { period: '6M', label: '6 months', pct: -1.41, annualised: false, from: '2026-05-13' },
    { period: '1Y', label: '1 year', pct: null, annualised: false, from: null },
  ],
  note: 'End-of-day prices from the NSE. Returns compare closing prices only: they are not adjusted for splits, bonus issues or dividends. Not live, and not investment advice.',
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/markets/stocks/RELIANCE']}>
      <ToastProvider>
        <Routes>
          <Route path="markets/stocks/:symbol" element={<StockDetail />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );

describe('Stock page', () => {
  beforeEach(() => {
    [openCopilot, add, remove].forEach((m) => m.mockReset());
    stock = { data: DATA, isLoading: false, error: null, refetch: vi.fn() };
    watch = { data: { items: [] } };
  });

  it('shows the name, symbol, industry and the latest close with its move', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'RELIANCE INDUSTRIES LTD' })).toBeInTheDocument();
    expect(screen.getByText('RELIANCE')).toBeInTheDocument();
    expect(screen.getByText('Oil Gas & Consumable Fuels')).toBeInTheDocument();
    expect(screen.getByText('Nifty 50')).toBeInTheDocument();
    expect(screen.getByText('₹1,339.70')).toBeInTheDocument();
    expect(screen.getAllByText('+1.49%')[0].closest('[data-trend]')).toHaveAttribute('data-trend', 'up');
    expect(screen.getByText(/as of 13 Nov 2026/i)).toBeInTheDocument();
  });

  it('shows the day\'s range, volume and value traded', () => {
    renderPage();
    const stats = screen.getByRole('region', { name: "Today's trading" });
    expect(stats).toHaveTextContent('₹1,325.00');
    expect(stats).toHaveTextContent('₹1,345.50');
    expect(stats).toHaveTextContent('₹1,318.20');
    expect(stats).toHaveTextContent('1,23,45,678');
    expect(stats).toHaveTextContent('₹1,841 Cr');
  });

  it('shows past returns by period, the day each is measured from, and a dash where history is missing', () => {
    renderPage();
    const table = screen.getByRole('table', { name: 'Price change over time' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(5);
    expect(rows[1]).toHaveTextContent('1 month');
    expect(rows[1]).toHaveTextContent('+14.83%');
    expect(rows[1]).toHaveTextContent('13 Oct 2026');
    expect(rows[3]).toHaveTextContent('-1.41%');
    expect(rows[4]).toHaveTextContent('–');
  });

  it('is honest about what the numbers leave out', () => {
    renderPage();
    expect(screen.getByText(/not adjusted for splits, bonus issues or dividends/i)).toBeInTheDocument();
    expect(screen.getByText(/past performance/i)).toBeInTheDocument();
  });

  it('adds the stock to the watchlist, and takes it off again', async () => {
    const user = userEvent.setup();
    const { unmount } = renderPage();
    await user.click(screen.getByRole('button', { name: 'Add to watchlist' }));
    expect(add.mock.calls[0][0]).toEqual({ kind: 'stock', ref: 'RELIANCE' });
    unmount();

    watch = { data: { items: [{ id: 'w1', kind: 'stock', ref: 'RELIANCE', label: 'RELIANCE INDUSTRIES LTD' }] } };
    renderPage();
    const button = screen.getByRole('button', { name: 'Remove from watchlist' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    await user.click(button);
    expect(remove.mock.calls[0][0]).toBe('w1');
  });

  it('asks Copilot to explain the stock without asking for a recommendation', async () => {
    renderPage();
    await userEvent.setup().click(screen.getByRole('button', { name: /Ask Copilot about this stock/ }));
    const prompt = openCopilot.mock.calls[0][0];
    expect(prompt).toMatch(/RELIANCE/);
    expect(prompt).toMatch(/do not give buy or sell advice/i);
  });

  it('says so when the stock cannot be found', () => {
    stock = { data: undefined, isLoading: false, error: Object.assign(new Error('We could not find that stock on the NSE.'), { status: 404 }), refetch: vi.fn() };
    renderPage();
    expect(screen.getByText(/could not find that stock/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to stocks/ })).toHaveAttribute('href', '/markets/stocks');
  });

  it('offers a retry when the data source is down', async () => {
    const refetch = vi.fn();
    stock = { data: undefined, isLoading: false, error: Object.assign(new Error('Market data is not reachable right now. Please try again in a few minutes.'), { status: 503 }), refetch };
    renderPage();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });
});
