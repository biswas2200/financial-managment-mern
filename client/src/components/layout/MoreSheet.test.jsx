import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { MoreSheet } from './MoreSheet.jsx';

const renderSheet = (props = {}) => {
  const onClose = vi.fn();
  render(
    <MemoryRouter>
      <MoreSheet open onClose={onClose} {...props} />
    </MemoryRouter>,
  );
  return onClose;
};

describe('MoreSheet', () => {
  it('lists every place in the app, grouped by domain, including Settings', () => {
    renderSheet();
    const dialog = screen.getByRole('dialog', { name: 'More' });
    for (const name of ['Analytics', 'Budgets', 'Stocks', 'Mutual funds', 'Watchlist', 'Learn', 'Discussions', 'Settings']) {
      expect(within(dialog).getByRole('link', { name })).toBeInTheDocument();
    }
    expect(within(dialog).getByRole('link', { name: 'Learn' })).toHaveAttribute('href', '/learn');
    expect(within(dialog).getByText('Invest')).toBeInTheDocument();
  });

  it('closes when you pick a place', async () => {
    const onClose = renderSheet();
    await userEvent.setup().click(screen.getByRole('link', { name: 'Budgets' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Escape and on the close button', async () => {
    const onClose = renderSheet();
    fireEvent(screen.getByRole('dialog', { name: 'More' }), new Event('cancel', { cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('shows nothing when it is closed', () => {
    renderSheet({ open: false });
    expect(screen.queryByRole('link', { name: 'Budgets' })).not.toBeInTheDocument();
  });
});
