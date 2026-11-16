import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLogin, useLogout, useMe } from './hooks.js';

const calls = [];
let signedIn = false;
vi.mock('./client.js', () => ({
  api: vi.fn(async (path, options = {}) => {
    calls.push(`${options.method ?? 'GET'} ${path}`);
    if (path === '/auth/me') {
      if (!signedIn) throw Object.assign(new Error('Not signed in'), { status: 401 });
      return { user: { id: 'u1', name: 'Asha' } };
    }
    if (path === '/auth/login') {
      signedIn = true;
      return { user: { id: 'u1', name: 'Asha' } };
    }
    if (path === '/auth/logout') {
      signedIn = false;
      return {};
    }
    return { items: [] };
  }),
}));

// Something that was already on the screen before sign-in, the way the cookie banner's provider is.
function Watcher() {
  const { data } = useMe();
  const login = useLogin();
  const logout = useLogout();
  return (
    <>
      <p data-testid="who">{data ? data.name : 'nobody'}</p>
      <button onClick={() => login.mutate({ email: 'a@b.c', password: 'x' })}>log in</button>
      <button onClick={() => logout.mutate()}>log out</button>
    </>
  );
}

const renderWatcher = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <Watcher />
    </QueryClientProvider>,
  );
  return client;
};

beforeEach(() => {
  signedIn = false;
  calls.length = 0;
});

describe('Signing in and out, for things that were already on the screen', () => {
  it('lets something that was watching "who is signed in" see the person who just signed in', async () => {
    renderWatcher();
    await waitFor(() => expect(calls).toContain('GET /auth/me'));
    expect(screen.getByTestId('who')).toHaveTextContent('nobody');
    await userEvent.setup().click(screen.getByRole('button', { name: 'log in' }));
    await waitFor(() => expect(screen.getByTestId('who')).toHaveTextContent('Asha'));
  });

  it('and sees them leave again when they sign out', async () => {
    const user = userEvent.setup();
    renderWatcher();
    await user.click(screen.getByRole('button', { name: 'log in' }));
    await waitFor(() => expect(screen.getByTestId('who')).toHaveTextContent('Asha'));
    await user.click(screen.getByRole('button', { name: 'log out' }));
    await waitFor(() => expect(screen.getByTestId('who')).toHaveTextContent('nobody'));
  });

  it('still forgets everything else the previous person had loaded', async () => {
    const client = renderWatcher();
    client.setQueryData(['transactions', {}], { items: ['someone else\'s'] });
    client.setQueryData(['budgets', '2026-11'], ['someone else\'s']);
    await userEvent.setup().click(screen.getByRole('button', { name: 'log in' }));
    await waitFor(() => expect(screen.getByTestId('who')).toHaveTextContent('Asha'));
    expect(client.getQueryData(['transactions', {}])).toBeUndefined();
    expect(client.getQueryData(['budgets', '2026-11'])).toBeUndefined();
  });
});
