import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '../../app/theme.jsx';
import { AuthLayout } from './AuthLayout.jsx';
import { LoginPage, RegisterPage } from './AuthPages.jsx';

vi.mock('../../api/hooks.js', () => ({
  useRegister: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useLogin: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}));

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );

const scenes = () => [...document.querySelectorAll('.sketch-scene')];

describe('Sign in and sign up share one skyline', () => {
  it('keeps the same drawing on the page when you go from sign in to sign up and back, so its animation never restarts', async () => {
    const user = userEvent.setup();
    renderAt('/login');
    const before = scenes();
    expect(before.length).toBeGreaterThan(0);

    await user.click(screen.getByRole('link', { name: 'Create an account' }));
    expect(await screen.findByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(scenes()).toHaveLength(before.length);
    scenes().forEach((el, i) => expect(el, `scene ${i} was rebuilt`).toBe(before[i]));

    await user.click(screen.getByRole('link', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    scenes().forEach((el, i) => expect(el, `scene ${i} was rebuilt`).toBe(before[i]));
  });

  it('keeps the logo and the headline in place too, and only the form changes', async () => {
    const user = userEvent.setup();
    renderAt('/login');
    const headline = screen.getByText('Know where every rupee goes.');
    await user.click(screen.getByRole('link', { name: 'Create an account' }));
    await screen.findByRole('heading', { name: 'Create your account' });
    expect(screen.getByText('Know where every rupee goes.')).toBe(headline);
    expect(screen.queryByRole('heading', { name: 'Welcome back' })).not.toBeInTheDocument();
  });

  it('shows the form on its own page, with one h1', () => {
    renderAt('/register');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('button', { name: 'Create account' }));
  });
});

describe('Where the reassurance about your data sits', () => {
  it('is a quiet note under the form, not floating over the drawing', () => {
    renderAt('/login');
    const note = screen.getByText(/Your data stays in your own Kosha database/i);
    expect(within(screen.getByRole('main')).getByText(/Your data stays in your own Kosha database/i)).toBe(note);
    for (const scene of scenes()) expect(scene.parentElement).not.toContainElement(note);
  });

  it('is on the sign-up form too', () => {
    renderAt('/register');
    expect(within(screen.getByRole('main')).getByText(/Your data stays in your own Kosha database/i)).toBeInTheDocument();
  });
});
