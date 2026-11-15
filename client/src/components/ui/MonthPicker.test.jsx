import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { currentMonthKey, shiftMonth, formatMonthLabel } from '@kosha/shared';
import { MonthPicker } from './MonthPicker.jsx';

const NOW = currentMonthKey();
const yearOf = (key) => key.slice(0, 4);

function setup(props = {}) {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(<MonthPicker value={NOW} onChange={onChange} {...props} />);
  return { onChange, user };
}
const openGrid = async (user) => {
  await user.click(screen.getByRole('button', { name: formatMonthLabel(NOW) }));
  return screen.getByRole('dialog', { name: 'Pick a month' });
};

describe('MonthPicker', () => {
  it('still steps one month at a time with the arrows', async () => {
    const { onChange, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(onChange).toHaveBeenCalledWith(shiftMonth(NOW, -1));
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
  });

  it('opens a grid of months when you click the month name', async () => {
    const { user } = setup();
    const grid = await openGrid(user);
    expect(within(grid).getByText(yearOf(NOW))).toBeInTheDocument();
    expect(within(grid).getAllByRole('button', { name: /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/ })).toHaveLength(12);
  });

  it('jumps straight to the month you click, and closes', async () => {
    const { onChange, user } = setup({ value: shiftMonth(NOW, -2) });
    await user.click(screen.getByRole('button', { name: formatMonthLabel(shiftMonth(NOW, -2)) }));
    const grid = screen.getByRole('dialog', { name: 'Pick a month' });
    const target = shiftMonth(NOW, -1);
    if (yearOf(target) !== yearOf(shiftMonth(NOW, -2))) await user.click(within(grid).getByRole('button', { name: 'Next year' }));
    await user.click(within(grid).getByRole('button', { name: formatMonthLabel(target) }));
    expect(onChange).toHaveBeenCalledWith(target);
    expect(screen.queryByRole('dialog', { name: 'Pick a month' })).not.toBeInTheDocument();
  });

  it('will not offer months that have not happened yet', async () => {
    const { user } = setup();
    const grid = await openGrid(user);
    const future = shiftMonth(NOW, 1);
    if (yearOf(future) === yearOf(NOW)) expect(within(grid).getByRole('button', { name: formatMonthLabel(future) })).toBeDisabled();
    expect(within(grid).getByRole('button', { name: 'Next year' })).toBeDisabled();
  });

  it('goes back year by year', async () => {
    const { user } = setup();
    const grid = await openGrid(user);
    await user.click(within(grid).getByRole('button', { name: 'Previous year' }));
    expect(within(grid).getByText(String(Number(yearOf(NOW)) - 1))).toBeInTheDocument();
    expect(within(grid).getByRole('button', { name: `January ${Number(yearOf(NOW)) - 1}` })).toBeEnabled();
  });

  it('respects the earliest month it is given', async () => {
    const min = shiftMonth(NOW, -3);
    const { user } = setup({ min });
    const grid = await openGrid(user);
    expect(within(grid).getByRole('button', { name: 'Previous year' })).toBeDisabled();
    const tooOld = shiftMonth(NOW, -4);
    if (yearOf(tooOld) === yearOf(NOW)) expect(within(grid).getByRole('button', { name: formatMonthLabel(tooOld) })).toBeDisabled();
    expect(within(grid).getByRole('button', { name: formatMonthLabel(min) })).toBeEnabled();
  });

  it('Escape closes it and puts focus back on the month name', async () => {
    const { user } = setup();
    await openGrid(user);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Pick a month' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: formatMonthLabel(NOW) })).toHaveFocus();
  });

  it('marks the month you are on', async () => {
    const { user } = setup();
    const grid = await openGrid(user);
    expect(within(grid).getByRole('button', { name: formatMonthLabel(NOW) })).toHaveAttribute('aria-current', 'date');
  });
});
