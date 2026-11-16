import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import MarketsPage from './MarketsPage.jsx';

const openCopilot = vi.fn();
let state;

vi.mock('../../api/hooks.js', () => ({ useMarketOverview: () => state }));
vi.mock('../assistant/CopilotDrawer.jsx', () => ({ useCopilot: () => ({ open: openCopilot }) }));

const stock = (symbol, name, close, change, changePct, valueCr, industry = 'Financial Services') => ({ symbol, name, close, change, changePct, valueCr, industry });
const DATA = {
  asOf: '2026-11-13',
  source: { name: 'NSE India', kind: 'end-of-day', url: 'https://www.nseindia.com/' },
  indices: [
    { name: 'Nifty 50', close: 25144.3, change: -155.05, changePct: -0.61, pe: 20.49, pb: 3.08, dividendYield: 1.4 },
    { name: 'Nifty Bank', close: 61034.1, change: -484.4, changePct: -0.79, pe: 13.49, pb: 1.84, dividendYield: 1.03 },
    { name: 'India VIX', close: 15.5, change: -1.12, changePct: 6.75, pe: null, pb: null, dividendYield: null },
  ],
  sectors: [
    { name: 'Nifty Energy', close: 36000, changePct: 0.03 },
    { name: 'Nifty Media', close: 1500, changePct: -0.2 },
  ],
  breadth: { advancers: 939, decliners: 1777, unchanged: 28, total: 2744 },
  gainers: [stock('EICHERMOT', 'EICHER MOTORS LTD', 5200.5, 68.5, 1.34, 300.1, 'Automobile')],
  losers: [stock('SHRIRAMFIN', 'SHRIRAM FINANCE LTD', 640.2, -22.3, -3.37, 220.4)],
  mostActive: [stock('HDFCBANK', 'HDFC BANK LTD', 1002.3, -5, -0.5, 1879.14)],
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <MarketsPage />
    </MemoryRouter>,
  );

describe('Markets overview', () => {
  beforeEach(() => {
    openCopilot.mockReset();
    state = { data: DATA, isLoading: false, error: null, refetch: vi.fn() };
  });

  it('says the figures are end-of-day and as of which day', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Markets' })).toBeInTheDocument();
    expect(screen.getByText(/as of 13 Nov 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/end-of-day/i)).toBeInTheDocument();
    expect(screen.getByText(/not live/i)).toBeInTheDocument();
  });

  it('shows each headline index with its level, move and a link to its page', () => {
    renderPage();
    const card = screen.getByRole('link', { name: /Nifty 50/ });
    expect(card).toHaveAttribute('href', '/markets/indices/Nifty%2050');
    expect(card).toHaveTextContent('25,144.30');
    const move = within(card).getByText('-0.61%');
    expect(move.closest('[data-trend]')).toHaveAttribute('data-trend', 'down');
    expect(card).toHaveTextContent('P/E 20.49');
    expect(screen.getByRole('link', { name: /India VIX/ })).toHaveTextContent('+6.75%');
  });

  it('shows how many stocks rose, fell and stood still, as separate positive counts', () => {
    renderPage();
    expect(screen.getByText('939')).toBeInTheDocument();
    expect(screen.getByText('1,777')).toBeInTheDocument();
    expect(screen.getByText('28')).toBeInTheDocument();
    expect(screen.getByText(/advancing/i)).toBeInTheDocument();
    expect(screen.getByText(/declining/i)).toBeInTheDocument();
  });

  it('lists the Nifty 50 gainers, losers and most traded with links to each stock', () => {
    renderPage();
    const gainers = screen.getByRole('region', { name: 'Top gainers' });
    const link = within(gainers).getByRole('link', { name: /EICHERMOT/ });
    expect(link).toHaveAttribute('href', '/markets/stocks/EICHERMOT');
    expect(link).toHaveTextContent('₹5,200.50');
    expect(link).toHaveTextContent('+1.34%');
    expect(within(screen.getByRole('region', { name: 'Top losers' })).getByRole('link', { name: /SHRIRAMFIN/ })).toHaveTextContent('-3.37%');
    expect(within(screen.getByRole('region', { name: 'Most traded' })).getByRole('link', { name: /HDFCBANK/ })).toHaveTextContent('₹1,879 Cr');
  });

  it('lists sectors, best first', () => {
    renderPage();
    const sectors = screen.getByRole('region', { name: 'Sectors' });
    const rows = within(sectors).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Nifty Energy');
    expect(rows[1]).toHaveTextContent('Nifty Media');
    expect(rows[1]).toHaveTextContent('-0.20%');
  });

  it('asks Copilot to explain the day, without asking for advice', async () => {
    renderPage();
    await userEvent.setup().click(screen.getByRole('button', { name: /Ask Copilot to explain the day/ }));
    expect(openCopilot).toHaveBeenCalledWith(expect.stringMatching(/latest trading day/i));
    expect(openCopilot.mock.calls[0][0]).toMatch(/do not give buy or sell advice/i);
  });

  it('points beginners to the article on how the market works', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /Nifty, Sensex and the exchanges/ })).toHaveAttribute('href', '/learn/nifty-sensex-basics');
  });

  it('shows a loading state', () => {
    state = { data: undefined, isLoading: true, error: null };
    renderPage();
    expect(screen.getByRole('status', { name: 'Loading market data' })).toBeInTheDocument();
  });

  it('says so, and shows no numbers, when the data source is unreachable', async () => {
    const refetch = vi.fn();
    state = { data: undefined, isLoading: false, error: Object.assign(new Error('Market data is not reachable right now. Please try again in a few minutes.'), { status: 503, code: 'MARKET_DATA_UNAVAILABLE' }), refetch };
    renderPage();
    expect(screen.getByText(/market data is not reachable right now/i)).toBeInTheDocument();
    expect(screen.queryByText('25,144.30')).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });
});
