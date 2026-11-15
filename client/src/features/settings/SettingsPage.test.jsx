import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../app/theme.jsx';
import { ToastProvider } from '../../components/ui/toast.jsx';
import SettingsPage from './SettingsPage.jsx';

// The page is a layout of forms; the data hooks are replaced so the screen renders without an API.
vi.mock('../../api/hooks.js', () => {
  const mutation = () => ({ mutate: vi.fn(), isPending: false });
  return {
    useMe: () => ({ data: { id: 'u1', name: 'Aarav Mehta', email: 'demo@kosha.app' } }),
    useUpdateProfile: mutation,
    useChangePassword: mutation,
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
    useAssistantStatus: () => ({ data: { provider: 'offline' } }),
  };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <ToastProvider>
          <SettingsPage />
        </ToastProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('SettingsPage', () => {
  it('renders every section without crashing', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    for (const name of ['Profile', 'Password', 'Appearance', 'Categories', 'Copilot engine']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
  });

  it('says "1 transaction" in the singular and "transactions" otherwise', () => {
    renderPage();
    expect(screen.getByText('1 transaction, ₹5,000')).toBeInTheDocument();
    expect(screen.getByText('171 transactions, ₹2,12,048')).toBeInTheDocument();
    expect(screen.getByText('Not used yet')).toBeInTheDocument();
  });

  it('has password fields with a show/hide toggle', async () => {
    renderPage();
    const current = screen.getByLabelText('Current password');
    expect(current).toHaveAttribute('type', 'password');
    await userEvent.setup().click(screen.getAllByRole('button', { name: 'Show password' })[0]);
    expect(current).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('New password')).toHaveAttribute('type', 'password');
  });
});
