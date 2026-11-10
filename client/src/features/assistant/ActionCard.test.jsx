import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionCard } from './ActionCard.jsx';

const txnAction = (status = 'pending') => ({
  type: 'create_transaction',
  status,
  preview: {
    type: 'expense',
    amount: 45000,
    description: 'Groceries',
    merchant: null,
    date: '2026-11-09',
    paymentMethod: 'UPI',
    category: { name: 'Groceries', color: '#eb6834', icon: 'shopping-basket' },
  },
});

describe('ActionCard (Copilot draft)', () => {
  it('previews a drafted transaction and confirms it', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ActionCard action={txnAction()} onConfirm={onConfirm} onCancel={onCancel} />);

    expect(screen.getByText('₹450.00')).toBeInTheDocument();
    expect(screen.getByText('Groceries', { selector: '[data-field="category"]' })).toBeInTheDocument();
    expect(screen.getByText(/9 Nov 2026/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: /discard/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows the outcome once resolved and hides the buttons', () => {
    render(<ActionCard action={txnAction('confirmed')} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/saved to your transactions/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument();
  });

  it('disables the buttons while saving', () => {
    render(<ActionCard action={txnAction()} busy onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });

  it('previews a drafted budget', () => {
    render(
      <ActionCard
        action={{
          type: 'set_budget',
          status: 'pending',
          preview: { limit: 500000, month: '2026-11', monthLabel: 'November 2026', category: { name: 'Dining Out', color: '#1baf7a', icon: 'utensils' } },
        }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('₹5,000.00')).toBeInTheDocument();
    expect(screen.getByText(/November 2026/)).toBeInTheDocument();
    expect(screen.getByText(/monthly budget/i)).toBeInTheDocument();
  });
});
