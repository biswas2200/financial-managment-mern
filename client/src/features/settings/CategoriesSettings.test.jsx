import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../../components/ui/toast.jsx';
import CategoriesSettings from './CategoriesSettings.jsx';

vi.mock('../../api/hooks.js', () => {
  const mutation = () => ({ mutate: vi.fn(), isPending: false });
  return {
    useCategories: () => ({
      isLoading: false,
      data: [
        { id: 'c1', name: 'Gifts', type: 'income', icon: 'gift', color: '#e87ba4', transactionCount: 1, totalAmount: 500000 },
        { id: 'c2', name: 'Groceries', type: 'expense', icon: 'shopping-basket', color: '#eb6834', transactionCount: 171, totalAmount: 21204800 },
        { id: 'c3', name: 'Travel', type: 'expense', icon: 'plane', color: '#1baf7a', transactionCount: 0, totalAmount: 0 },
      ],
    }),
    useSaveCategory: mutation,
    useDeleteCategory: mutation,
  };
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <ToastProvider>
        <CategoriesSettings />
      </ToastProvider>
    </MemoryRouter>,
  );

describe('CategoriesSettings', () => {
  it('lists expense and income categories side by side', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Categories' })).toBeInTheDocument();
    expect(screen.getByText('Expense categories')).toBeInTheDocument();
    expect(screen.getByText('Income categories')).toBeInTheDocument();
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Gifts')).toBeInTheDocument();
  });

  it('says "1 transaction" in the singular and "transactions" otherwise', () => {
    renderPage();
    expect(screen.getByText('1 transaction, ₹5,000')).toBeInTheDocument();
    expect(screen.getByText('171 transactions, ₹2,12,048')).toBeInTheDocument();
    expect(screen.getByText('Not used yet')).toBeInTheDocument();
  });

  it('will not delete a category that has transactions', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Delete Groceries' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete Travel' })).toBeEnabled();
  });

  it('opens the new-category form from the page', async () => {
    renderPage();
    await userEvent.setup().click(screen.getByRole('button', { name: 'New category' }));
    expect(screen.getByRole('dialog', { name: 'New category' })).toBeInTheDocument();
  });
});
