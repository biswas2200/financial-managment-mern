import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toDayKey } from '@kosha/shared';
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

const save = () => screen.getByRole('button', { name: /save (transaction|changes)/i });

describe('TransactionForm', () => {
  it('asks only for what is missing: amount and category', async () => {
    const { onSubmit, user } = setup();
    await user.click(save());

    expect(await screen.findByText(/amount is required/i)).toBeInTheDocument();
    expect(screen.getByText(/choose a category/i)).toBeInTheDocument();
    expect(screen.queryByText(/add a short description/i)).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects amounts with more than two decimals', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText(/amount/i), '12.345');
    await user.click(save());
    expect(await screen.findByText(/at most 2 decimal places/i)).toBeInTheDocument();
  });

  it('picks the category from visible chips and fills in the description', async () => {
    const { onSubmit, user } = setup();
    await user.type(screen.getByLabelText(/amount/i), '450.50');
    await user.click(screen.getByRole('radio', { name: 'Groceries' }));
    await user.click(save());

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toMatchObject({
      type: 'expense',
      amount: 45050,
      category: '665f1f77bcf86cd799439011',
      description: 'Groceries',
      paymentMethod: 'UPI',
    });
    expect(payload.date).toBeInstanceOf(Date);
    expect(toDayKey(payload.date)).toBe(toDayKey(new Date()));
  });

  it('uses the merchant as the description when one is given', async () => {
    const { onSubmit, user } = setup();
    await user.type(screen.getByLabelText(/amount/i), '380');
    await user.click(screen.getByRole('radio', { name: 'Dining Out' }));
    await user.type(screen.getByLabelText(/merchant/i), 'Swiggy');
    await user.click(save());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ description: 'Swiggy', merchant: 'Swiggy' });
  });

  it('has one-tap date and payment shortcuts', async () => {
    const { onSubmit, user } = setup();
    await user.type(screen.getByLabelText(/amount/i), '99');
    await user.click(screen.getByRole('radio', { name: 'Groceries' }));
    await user.click(screen.getByRole('radio', { name: 'Yesterday' }));
    await user.click(screen.getByRole('radio', { name: 'Card' }));
    await user.click(save());

    const payload = onSubmit.mock.calls[0][0];
    const yesterday = toDayKey(new Date(Date.now() - 86400000));
    expect(toDayKey(payload.date)).toBe(yesterday);
    expect(payload.paymentMethod).toBe('Card');
  });

  it('only offers categories matching the selected type', async () => {
    const { user } = setup();
    expect(screen.getByRole('radio', { name: 'Groceries' })).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /^income$/i }));
    expect(screen.queryByRole('radio', { name: 'Groceries' })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Salary' })).toBeInTheDocument();
  });

  it('can open preset to income', () => {
    setup({ defaultType: 'income' });
    expect(screen.getByRole('radio', { name: /^income$/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Salary' })).toBeInTheDocument();
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
    expect(screen.getByRole('radio', { name: 'Dining Out' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Card' })).toBeChecked();
    expect(screen.getByLabelText(/pick a date/i)).toHaveValue('2026-10-28');
    expect(save()).toHaveTextContent(/save changes/i);
  });
});
