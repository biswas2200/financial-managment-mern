import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpendingCalendar } from './SpendingCalendar.jsx';

const days = (month, count, spend = {}) =>
  Array.from({ length: count }, (_, i) => {
    const date = `${month}-${String(i + 1).padStart(2, '0')}`;
    return { date, income: 0, expense: spend[date]?.expense ?? 0, count: spend[date]?.count ?? 0 };
  });

const MONTH = '2024-03'; // long past, so no day is "in the future"
const DATA = days(MONTH, 31, { '2024-03-05': { expense: 250000, count: 2 } });

describe('SpendingCalendar', () => {
  it('tells you which day you picked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<SpendingCalendar days={DATA} onSelect={onSelect} />);
    await user.click(screen.getByRole('gridcell', { name: /Tuesday, 5 Mar/ }));
    expect(onSelect).toHaveBeenCalledWith('2024-03-05');
  });

  it('shows the picked day as pressed, and clicking it again lets go', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { rerender } = render(<SpendingCalendar days={DATA} selected="2024-03-05" onSelect={onSelect} />);
    const cell = screen.getByRole('gridcell', { name: /Tuesday, 5 Mar/ });
    expect(cell).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('gridcell', { name: /Wednesday, 6 Mar/ })).toHaveAttribute('aria-pressed', 'false');
    await user.click(cell);
    expect(onSelect).toHaveBeenCalledWith(null);
    rerender(<SpendingCalendar days={DATA} selected={null} onSelect={onSelect} />);
    expect(screen.getByRole('gridcell', { name: /Tuesday, 5 Mar/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('lets you pick a day with no spending, to add one for it', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<SpendingCalendar days={DATA} onSelect={onSelect} />);
    await user.click(screen.getByRole('gridcell', { name: /Friday, 1 Mar/ }));
    expect(onSelect).toHaveBeenCalledWith('2024-03-01');
  });

  it('does not let you pick a day that has not happened', () => {
    const future = days('2999-01', 31);
    render(<SpendingCalendar days={future} onSelect={() => {}} />);
    expect(screen.getByRole('gridcell', { name: /, 1 Jan:/ })).toBeDisabled();
  });

  it('still draws the whole month when there is nothing to show', () => {
    render(<SpendingCalendar days={days(MONTH, 31)} />);
    expect(screen.getAllByRole('gridcell')).toHaveLength(31);
    expect(screen.getByText(/no spending/i)).toBeInTheDocument();
  });
});
