import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../../components/ui/toast.jsx';
import FundDetail from './FundDetail.jsx';

const openCopilot = vi.fn();
const add = vi.fn();
let fund;

vi.mock('../../api/hooks.js', () => ({
  useFund: () => fund,
  useWatchlist: () => ({ data: { items: [] } }),
  useAddWatch: () => ({ mutate: add, isPending: false }),
  useRemoveWatch: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../assistant/CopilotDrawer.jsx', () => ({ useCopilot: () => ({ open: openCopilot }) }));

const history = Array.from({ length: 30 }, (_, i) => ({ day: `2026-0${1 + Math.floor(i / 10)}-${String((i % 10) + 10)}`, nav: 150 + i }));
const DATA = {
  code: 120716, name: 'UTI Nifty 50 Index Fund - Direct Plan - Growth', house: 'UTI Mutual Fund', category: 'Other Scheme - Index Funds', type: 'Open Ended Schemes', nav: 177.162, navDate: '2026-11-13',
  returns: [
    { period: '1M', label: '1 month', pct: 10.73, annualised: false, from: '2026-10-13' },
    { period: '1Y', label: '1 year', pct: -2.02, annualised: false, from: '2025-11-13' },
    { period: '3Y', label: '3 years', pct: 9.97, annualised: true, from: '2023-11-13' },
    { period: '5Y', label: '5 years', pct: 7.81, annualised: true, from: '2021-11-12' },
  ],
  sinceLaunch: { since: '2013-01-02', years: 13.9, pct: 11.87 },
  risk: { maxDrawdownPct: 38.42, positiveYearShare: 83.6 },
  history,
  note: 'NAV data from AMFI via mfapi.in. Past performance does not predict future returns. Returns above one year are annualised.',
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/markets/funds/120716']}>
      <ToastProvider>
        <Routes>
          <Route path="markets/funds/:code" element={<FundDetail />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );

describe('Fund page', () => {
  beforeEach(() => {
    openCopilot.mockReset();
    add.mockReset();
    fund = { data: DATA, isLoading: false, error: null, refetch: vi.fn() };
  });

  it('shows the fund, its house, category and latest NAV', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: /UTI Nifty 50 Index Fund/ })).toBeInTheDocument();
    expect(screen.getByText('UTI Mutual Fund')).toBeInTheDocument();
    expect(screen.getByText('Other Scheme - Index Funds')).toBeInTheDocument();
    expect(screen.getByText('₹177.1620')).toBeInTheDocument();
    expect(screen.getByText(/NAV of 13 Nov 2026/i)).toBeInTheDocument();
  });

  it('shows returns, with those over a year marked as yearly rates', () => {
    renderPage();
    const rows = within(screen.getByRole('table', { name: 'Fund returns' })).getAllByRole('row').slice(1);
    expect(rows[1]).toHaveTextContent('-2.02%');
    expect(rows[2]).toHaveTextContent('+9.97%');
    expect(rows[2]).toHaveTextContent(/a year/i);
    expect(screen.getByText(/^Since launch \(/i)).toBeInTheDocument();
    expect(screen.getByText(/11\.87%/)).toBeInTheDocument();
  });

  it('explains risk in plain words: the worst fall and how often a year ended higher', () => {
    renderPage();
    const risk = screen.getByRole('region', { name: 'How bumpy has it been?' });
    expect(risk).toHaveTextContent('38.42%');
    expect(risk).toHaveTextContent(/fallen as much as/i);
    expect(risk).toHaveTextContent('83.6%');
    expect(risk).toHaveTextContent(/of one-year periods/i);
  });

  it('draws the NAV history with a text equivalent', async () => {
    renderPage();
    expect(screen.getByRole('img', { name: /NAV from ₹150\.0000 to ₹179\.0000/ })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Table' }));
    expect(screen.getByRole('table', { name: 'NAV history' })).toBeInTheDocument();
  });

  it('can be watched and explained by Copilot, which is told not to recommend', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Add to watchlist' }));
    expect(add.mock.calls[0][0]).toEqual({ kind: 'fund', ref: '120716' });
    await user.click(screen.getByRole('button', { name: /Ask Copilot about this fund/ }));
    expect(openCopilot.mock.calls[0][0]).toMatch(/UTI Nifty 50 Index Fund/);
    expect(openCopilot.mock.calls[0][0]).toMatch(/do not give buy or sell advice/i);
  });

  it('keeps the standard warning in view', () => {
    renderPage();
    expect(screen.getByText(/past performance does not predict future returns/i)).toBeInTheDocument();
  });

  it('says when the fund is not found', () => {
    fund = { data: undefined, isLoading: false, error: Object.assign(new Error('We could not find that fund.'), { status: 404 }), refetch: vi.fn() };
    renderPage();
    expect(screen.getByText(/could not find that fund/i)).toBeInTheDocument();
  });
});
