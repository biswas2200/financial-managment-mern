import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../../components/ui/toast.jsx';
import ProfileSettings from './ProfileSettings.jsx';

const updateProfile = vi.fn();

vi.mock('../../api/hooks.js', () => {
  const mutation = () => ({ mutate: vi.fn(), isPending: false });
  return {
    useMe: () => ({
      data: { id: 'u1', name: 'Aarav Mehta', email: 'demo@kosha.app', phone: '+919876543210', dateOfBirth: '1999-04-02' },
    }),
    useUpdateProfile: () => ({ mutate: updateProfile, isPending: false }),
    useChangePassword: mutation,
  };
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <ToastProvider>
        <ProfileSettings />
      </ToastProvider>
    </MemoryRouter>,
  );

describe('ProfileSettings', () => {
  it('has a profile form and a password form', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Password' })).toBeInTheDocument();
  });

  it('has password fields with a show/hide toggle', async () => {
    renderPage();
    const current = screen.getByLabelText('Current password');
    expect(current).toHaveAttribute('type', 'password');
    await userEvent.setup().click(screen.getAllByRole('button', { name: 'Show password' })[0]);
    expect(current).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('New password')).toHaveAttribute('type', 'password');
  });

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
