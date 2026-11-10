import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiStrip } from './KpiStrip.jsx';

const summary = {
  income: 10751200,
  expense: 5776000,
  net: 4975200,
  savingsRate: 46.3,
  count: 24,
  period: { label: '2026-11', partial: true },
  change: { income: 5.2, expense: 12.4, net: -3.1 },
};

describe('KpiStrip', () => {
  it('shows income, expenses, savings and savings rate in rupees', () => {
    render(<KpiStrip summary={summary} />);
    expect(screen.getByTestId('kpi-income')).toHaveTextContent('₹1,07,512');
    expect(screen.getByTestId('kpi-expense')).toHaveTextContent('₹57,760');
    expect(screen.getByTestId('kpi-net')).toHaveTextContent('₹49,752');
    expect(screen.getByTestId('kpi-rate')).toHaveTextContent('46.3%');
  });

  it('marks rising spending as bad and rising income as good', () => {
    render(<KpiStrip summary={summary} />);
    const expenseDelta = screen.getByTestId('kpi-expense-delta');
    expect(expenseDelta).toHaveTextContent('12.4%');
    expect(expenseDelta).toHaveAttribute('data-tone', 'negative');
    expect(screen.getByTestId('kpi-income-delta')).toHaveAttribute('data-tone', 'positive');
    expect(screen.getByTestId('kpi-net-delta')).toHaveAttribute('data-tone', 'negative');
  });

  it('explains the comparison window', () => {
    render(<KpiStrip summary={summary} />);
    expect(screen.getAllByText(/vs same days last month/i).length).toBeGreaterThan(0);
  });

  it('handles a month with no income', () => {
    render(<KpiStrip summary={{ ...summary, income: 0, savingsRate: null, change: { income: null, expense: null, net: null } }} />);
    expect(screen.getByTestId('kpi-rate')).toHaveTextContent('n/a');
    expect(screen.queryByTestId('kpi-income-delta')).not.toBeInTheDocument();
  });
});
