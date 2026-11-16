import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../../components/ui/toast.jsx';
import PrivacySettings from './PrivacySettings.jsx';

const deleteAccount = vi.fn();

vi.mock('../../api/hooks.js', () => ({
  useMe: () => ({ data: { id: 'u1', name: 'Aarav Mehta', consent: { termsVersion: '2026-11-16', acceptedAt: '2026-11-10T07:05:03.243Z' } } }),
  useDeleteAccount: () => ({ mutate: deleteAccount, isPending: false }),
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <ToastProvider>
        <PrivacySettings />
      </ToastProvider>
    </MemoryRouter>,
  );

describe('PrivacySettings', () => {
  it('shows what you agreed to and when, with links to read it', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Privacy and your data' })).toBeInTheDocument();
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
