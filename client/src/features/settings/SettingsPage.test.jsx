import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../app/theme.jsx';
import { ToastProvider } from '../../components/ui/toast.jsx';
import SettingsPage from './SettingsPage.jsx';

const deleteAccount = vi.fn();
const updateProfile = vi.fn();

// The page is a layout of forms; the data hooks are replaced so the screen renders without an API.
vi.mock('../../api/hooks.js', () => {
  const mutation = () => ({ mutate: vi.fn(), isPending: false });
  return {
    useMe: () => ({
      data: {
        id: 'u1',
        name: 'Aarav Mehta',
        email: 'demo@kosha.app',
        phone: '+919876543210',
        dateOfBirth: '1999-04-02',
        consent: { termsVersion: '2026-11-16', acceptedAt: '2026-11-10T07:05:03.243Z' },
      },
    }),
    useDeleteAccount: () => ({ mutate: deleteAccount, isPending: false }),
    useUpdateProfile: () => ({ mutate: updateProfile, isPending: false }),
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
    for (const name of ['Profile', 'Password', 'Appearance', 'Categories', 'Copilot engine', 'Privacy and your data']) {
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

  describe('profile details', () => {
    it('fills in the phone number and date of birth you gave', () => {
      renderPage();
      expect(screen.getByLabelText(/phone number/i)).toHaveValue('+919876543210');
      expect(screen.getByLabelText('Date of birth, day')).toHaveValue('02');
      expect(screen.getByLabelText('Date of birth, month')).toHaveValue('04');
      expect(screen.getByLabelText('Date of birth, year')).toHaveValue('1999');
    });

    it('saves them together with the name and the picture', async () => {
      updateProfile.mockReset();
      const user = userEvent.setup();
      renderPage();
      await user.clear(screen.getByLabelText(/phone number/i));
      await user.type(screen.getByLabelText(/phone number/i), '91234 56780');
      await user.click(screen.getByRole('button', { name: 'Use the rocket icon' }));
      await user.click(screen.getByRole('button', { name: 'Save profile' }));
      await vi.waitFor(() => expect(updateProfile).toHaveBeenCalled());
      expect(updateProfile.mock.calls[0][0]).toMatchObject({
        name: 'Aarav Mehta',
        phone: '+919123456780',
        dateOfBirth: '1999-04-02',
        avatar: { type: 'preset', preset: 'rocket' },
      });
    });

    it('lets you remove the phone number by clearing it', async () => {
      updateProfile.mockReset();
      const user = userEvent.setup();
      renderPage();
      await user.clear(screen.getByLabelText(/phone number/i));
      await user.click(screen.getByRole('button', { name: 'Save profile' }));
      await vi.waitFor(() => expect(updateProfile).toHaveBeenCalled());
      expect(updateProfile.mock.calls[0][0].phone).toBeNull();
    });
  });

  describe('privacy and your data', () => {
    it('shows what you agreed to and when, with links to read it', () => {
      renderPage();
      expect(screen.getByText(/you accepted version 2026-11-16/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
      expect(screen.getByRole('link', { name: 'Terms of Use' })).toHaveAttribute('href', '/terms');
    });

    it('asks for your password before deleting the account, and says what goes', async () => {
      deleteAccount.mockReset();
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByRole('button', { name: 'Delete my account' }));
      const dialog = screen.getByRole('dialog', { name: 'Delete your account?' });
      expect(dialog).toHaveTextContent(/permanently/i);
      expect(dialog).toHaveTextContent(/transactions, budgets, categories and Copilot messages/i);
      await user.click(within(dialog).getByRole('button', { name: 'Delete everything' }));
      expect(await within(dialog).findByText(/enter your password/i)).toBeInTheDocument();
      expect(deleteAccount).not.toHaveBeenCalled();
      await user.type(within(dialog).getByLabelText('Your password'), 'Demo@1234');
      await user.click(within(dialog).getByRole('button', { name: 'Delete everything' }));
      expect(deleteAccount.mock.calls[0][0]).toEqual({ password: 'Demo@1234' });
    });
  });
});
