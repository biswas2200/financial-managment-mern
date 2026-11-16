import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { MessageData } from './MessageData.jsx';

const close = vi.fn();
vi.mock('./CopilotDrawer.jsx', () => ({ useCopilot: () => ({ open: vi.fn(), close }) }));

const renderData = (data) => render(<MemoryRouter><MessageData data={data} /></MemoryRouter>);

describe('Copilot answers that carry market data', () => {
  it('shows guides as cards that open in Learn, and closes the Copilot panel when you follow one', async () => {
    close.mockReset();
    renderData({ kind: 'articles', items: [{ slug: 'emergency-fund', title: 'Build an emergency fund', summary: 'A cash cushion.', domain: 'saving', readMinutes: 5 }] });
    const link = screen.getByRole('link', { name: /Build an emergency fund/ });
    expect(link).toHaveAttribute('href', '/learn/emergency-fund');
    expect(link).toHaveTextContent('5 min read');
    await userEvent.setup().click(link);
    expect(close).toHaveBeenCalled();
  });

  it('shows a stock, index or fund quote with its price, move and returns, and the day it is for', () => {
    renderData({
      kind: 'quote', type: 'stock', symbol: 'TCS', name: 'TATA CONSULTANCY SERVICES LTD', price: 3020.5, changePct: -0.4, asOf: '2026-11-13',
      returns: [{ period: '1M', label: '1 month', pct: 2.5 }, { period: '1Y', label: '1 year', pct: null }],
    });
    expect(screen.getByText('TATA CONSULTANCY SERVICES LTD')).toBeInTheDocument();
    expect(screen.getByText('₹3,020.50')).toBeInTheDocument();
    expect(screen.getByText('-0.40%').closest('[data-trend]')).toHaveAttribute('data-trend', 'down');
    expect(screen.getByText(/13 Nov 2026/)).toBeInTheDocument();
    expect(screen.getByText('+2.50%')).toBeInTheDocument();
    expect(screen.getByText('–')).toBeInTheDocument(); // no history, no number
  });

  it('writes an index level without a rupee sign and a fund NAV with four decimals', () => {
    const { unmount } = renderData({ kind: 'quote', type: 'index', name: 'Nifty 50', price: 25144.3, changePct: -0.61, asOf: '2026-11-13', returns: [] });
    expect(screen.getByText('25,144.30')).toBeInTheDocument();
    unmount();
    renderData({ kind: 'quote', type: 'fund', name: 'UTI Nifty 50 Index Fund', price: 177.162, changePct: null, asOf: '2026-11-13', returns: [] });
    expect(screen.getByText('₹177.1620')).toBeInTheDocument();
  });

  it('summarises the market: indices and how many stocks rose and fell', () => {
    renderData({
      kind: 'market', asOf: '2026-11-13',
      indices: [{ name: 'Nifty 50', close: 25144.3, changePct: -0.61 }, { name: 'Nifty Bank', close: 61034.1, changePct: -0.79 }],
      breadth: { advancers: 939, decliners: 1777, unchanged: 28, total: 2744 },
      gainers: [{ symbol: 'EICHERMOT', changePct: 1.34 }], losers: [{ symbol: 'SHRIRAMFIN', changePct: -3.37 }],
    });
    expect(screen.getByText('Nifty 50')).toBeInTheDocument();
    expect(screen.getByText('25,144.30')).toBeInTheDocument();
    expect(screen.getByText(/939 advancing/)).toBeInTheDocument();
    expect(screen.getByText(/1,777 declining/)).toBeInTheDocument();
    expect(screen.getByText('EICHERMOT')).toBeInTheDocument();
    expect(screen.getByText(/end-of-day/i)).toBeInTheDocument();
  });

  it('still shows nothing for a kind it does not know', () => {
    const { container } = renderData({ kind: 'mystery' });
    expect(container).toBeEmptyDOMElement();
  });
});
