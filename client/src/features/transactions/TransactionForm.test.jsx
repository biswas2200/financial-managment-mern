import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionForm } from './TransactionForm.jsx';

const categories = [
  { id: '665f1f77bcf86cd799439011', name: 'Groceries', type: 'expense', icon: 'shopping-basket', color: '#eb6834' },
  { id: '665f1f77bcf86cd799439012', name: 'Dining Out', type: 'expense', icon: 'utensils', color: '#1baf7a' },
  { id: '665f1f77bcf86cd799439013', name: 'Salary', type: 'income', icon: 'briefcase', color: '#1baf7a' },
];

function setup(props = {}) {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  render(<TransactionForm categories={categories} onSubmit={onSubmit} {...props} />);
  return { onSubmit, user };
}

describe('TransactionForm', () => {
  it('shows validation messages instead of submitting an empty form', async () => {
    const { onSubmit, user } = setup();
    await user.click(screen.getByRole('button', { name: /save transaction/i }));

    expect(await screen.findByText(/amount is required/i)).toBeInTheDocument();
    expect(screen.getByText(/choose a category/i)).toBeInTheDocument();
    expect(screen.getByText(/add a short description/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects amounts with more than two decimals', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText(/amount/i), '12.345');
    await user.click(screen.getByRole('button', { name: /save transaction/i }));
    expect(await screen.findByText(/at most 2 decimal places/i)).toBeInTheDocument();
  });

  it('submits integer paise and the chosen category', async () => {
    const { onSubmit, user } = setup();
    await user.type(screen.getByLabelText(/amount/i), '450.50');
    await user.selectOptions(screen.getByLabelText(/category/i), 'Groceries');
    await user.type(screen.getByLabelText(/description/i), 'Weekly groceries');
    await user.click(screen.getByRole('button', { name: /save transaction/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toMatchObject({
      type: 'expense',
      amount: 45050,
      category: '665f1f77bcf86cd799439011',
      description: 'Weekly groceries',
      paymentMethod: 'UPI',
    });
    expect(payload.date).toBeInstanceOf(Date);
  });

  it('only offers categories matching the selected type', async () => {
    const { user } = setup();
    const select = screen.getByLabelText(/category/i);
    expect(within(select).getByRole('option', { name: 'Groceries' })).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /income/i }));
    expect(within(select).queryByRole('option', { name: 'Groceries' })).not.toBeInTheDocument();
    expect(within(select).getByRole('option', { name: 'Salary' })).toBeInTheDocument();
  });

  it('pre-fills values when editing', () => {
    setup({
      initialValues: {
        type: 'expense',
        amount: 38000,
        category: { id: '665f1f77bcf86cd799439012' },
        description: 'Biryani night',
        date: '2026-10-28T06:30:00.000Z',
        paymentMethod: 'Card',
      },
    });
    expect(screen.getByLabelText(/amount/i)).toHaveValue('380.00');
    expect(screen.getByLabelText(/description/i)).toHaveValue('Biryani night');
    expect(screen.getByLabelText(/category/i)).toHaveValue('665f1f77bcf86cd799439012');
    expect(screen.getByLabelText(/date/i)).toHaveValue('2026-10-28');
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });
});
