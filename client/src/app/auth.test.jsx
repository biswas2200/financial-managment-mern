import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
