import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RequireAuth, GuestOnly } from './auth.jsx';

let me;
vi.mock('../api/hooks.js', () => ({ useMe: () => me }));

const renderAt = (path, landing) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>Login page</p>} />
        <Route element={<RequireAuth landing={landing} />}>
          <Route index element={<p>Dashboard</p>} />
          <Route path="budgets" element={<p>Budgets page</p>} />
        </Route>
        <Route element={<GuestOnly />}>
          <Route path="/register" element={<p>Register page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe('RequireAuth', () => {
  it('shows the landing page to visitors at the front door', () => {
    me = { data: null, isLoading: false };
    renderAt('/', <p>Landing page</p>);
    expect(screen.getByText('Landing page')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('sends visitors to sign in when they ask for any other page', () => {
    me = { data: null, isLoading: false };
    renderAt('/budgets', <p>Landing page</p>);
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('shows the app to someone who is signed in, even at the front door', () => {
    me = { data: { id: 'u1' }, isLoading: false };
    renderAt('/', <p>Landing page</p>);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Landing page')).not.toBeInTheDocument();
  });

  it('still sends visitors to sign in at the front door when no landing page is given', () => {
    me = { data: null, isLoading: false };
    renderAt('/');
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('waits, showing the splash, while it finds out who you are', () => {
    me = { data: undefined, isLoading: true };
    renderAt('/', <p>Landing page</p>);
    expect(screen.getByRole('status', { name: 'Loading Kosha' })).toBeInTheDocument();
    expect(screen.queryByText('Landing page')).not.toBeInTheDocument();
  });
});

describe('RequireAuth when the server cannot be reached', () => {
  const networkError = Object.assign(new Error("Can't reach the Kosha server."), { status: 0, code: 'NETWORK_ERROR' });
  // The app remembers that this browser has signed in before, so a lost connection is not read as being signed out.
  beforeEach(() => localStorage.setItem('kosha-signed-in', '1'));
  afterEach(() => localStorage.clear());

  it('shows a first-time visitor the landing page even with no connection, since there is no sign-in to check', () => {
    localStorage.clear();
    me = { data: undefined, isLoading: false, error: networkError, refetch: vi.fn() };
    renderAt('/', <p>Landing page</p>);
    expect(screen.getByText('Landing page')).toBeInTheDocument();
  });

  it('remembers a sign-in, and forgets it when the person signs out or the session ends', () => {
    localStorage.clear();
    me = { data: { id: 'u1' }, isLoading: false, error: null };
    const first = renderAt('/');
    expect(localStorage.getItem('kosha-signed-in')).toBe('1');
    first.unmount();
    me = { data: null, isLoading: false, error: null };
    renderAt('/budgets');
    expect(localStorage.getItem('kosha-signed-in')).toBeNull();
  });

  it('does not mistake being offline for being signed out: it says so and offers to try again', async () => {
    const refetch = vi.fn();
    me = { data: undefined, isLoading: false, error: networkError, refetch };
    renderAt('/', <p>Landing page</p>);
    expect(screen.getByRole('heading', { name: /you're offline/i })).toBeInTheDocument();
    expect(screen.queryByText('Landing page')).not.toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('does the same on any other page, instead of sending someone to sign in', () => {
    me = { data: undefined, isLoading: false, error: networkError, refetch: vi.fn() };
    renderAt('/budgets');
    expect(screen.getByRole('heading', { name: /you're offline/i })).toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });

  it('still treats a real "not signed in" answer as signed out', () => {
    me = { data: undefined, isLoading: false, error: Object.assign(new Error('Please sign in'), { status: 401 }), refetch: vi.fn() };
    renderAt('/budgets');
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('keeps showing the app if you drop offline after signing in', () => {
    me = { data: { id: 'u1' }, isLoading: false, error: networkError, refetch: vi.fn() };
    renderAt('/');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});

describe('GuestOnly', () => {
  it('lets visitors see the register page and bounces signed-in users to the app', () => {
    me = { data: null, isLoading: false };
    const { unmount } = renderAt('/register');
    expect(screen.getByText('Register page')).toBeInTheDocument();
    unmount();
    me = { data: { id: 'u1' }, isLoading: false };
    renderAt('/register');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
