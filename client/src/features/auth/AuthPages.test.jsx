import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../app/theme.jsx';
import { RegisterPage } from './AuthPages.jsx';

const mutate = vi.fn();
vi.mock('../../api/hooks.js', () => ({
  useRegister: () => ({ mutate, isPending: false, error: null }),
  useLogin: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}));

const renderRegister = () =>
  render(
    <MemoryRouter>
      <ThemeProvider>
        <RegisterPage />
      </ThemeProvider>
    </MemoryRouter>,
  );

async function fillRequired(user) {
  await user.type(screen.getByLabelText('Name'), 'Neha Kulkarni');
  await user.type(screen.getByLabelText('Email'), 'neha@kosha.test');
  await user.type(screen.getByLabelText('Password', { exact: true }), 'secret123');
}

describe('Sign-up form: consent, phone and date of birth', () => {
  beforeEach(() => mutate.mockReset());

  it('will not create an account until the Terms and Privacy Policy are accepted', async () => {
    const user = userEvent.setup();
    renderRegister();
    await fillRequired(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText(/please accept the terms/i)).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('links to both documents in a new tab, so nothing typed is lost', () => {
    renderRegister();
    const terms = screen.getByRole('link', { name: 'Terms of Use' });
    const privacy = screen.getByRole('link', { name: 'Privacy Policy' });
    expect(terms).toHaveAttribute('href', '/terms');
    expect(privacy).toHaveAttribute('href', '/privacy');
    expect(terms).toHaveAttribute('target', '_blank');
  });

  it('sends the consent along with the details, and phone and date of birth are optional', async () => {
    const user = userEvent.setup();
    renderRegister();
    await fillRequired(user);
    await user.click(screen.getByRole('checkbox', { name: /i agree/i }));
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(mutate).toHaveBeenCalled());
    expect(mutate.mock.calls[0][0]).toMatchObject({ name: 'Neha Kulkarni', email: 'neha@kosha.test', acceptedTerms: true, phone: null, dateOfBirth: null });
  });

  it('normalises a phone number and passes the date of birth', async () => {
    const user = userEvent.setup();
    renderRegister();
    await fillRequired(user);
    await user.type(screen.getByLabelText(/phone number/i), '98765 43210');
    await user.click(screen.getByLabelText('Date of birth, day'));
    await user.keyboard('09042001');
    await user.click(screen.getByRole('checkbox', { name: /i agree/i }));
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(mutate).toHaveBeenCalled());
    expect(mutate.mock.calls[0][0]).toMatchObject({ phone: '+919876543210', dateOfBirth: '2001-04-09' });
  });

  it('says what is wrong with a half-typed date of birth', async () => {
    const user = userEvent.setup();
    renderRegister();
    await fillRequired(user);
    await user.click(screen.getByLabelText('Date of birth, day'));
    await user.keyboard('12');
    await user.click(screen.getByRole('checkbox', { name: /i agree/i }));
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText(/valid date of birth/i)).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });
});
