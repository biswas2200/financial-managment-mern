import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RouteError } from './RouteError.jsx';

const reload = vi.fn();
vi.mock('../lib/reload.js', () => ({ reloadPage: () => reload() }));

beforeEach(() => {
  reload.mockReset();
  sessionStorage.clear();
});

let routeError;
vi.mock('react-router-dom', async (importOriginal) => ({ ...(await importOriginal()), useRouteError: () => routeError }));

// The data router's own error handling needs a real browser (jsdom cannot build its requests), so this renders the
// error screen directly with the error the router would have given it.
const renderBroken = (error) => {
  routeError = error;
  return render(
    <MemoryRouter>
      <RouteError />
    </MemoryRouter>,
  );
};

describe('RouteError', () => {
  it('says Kosha was updated, and reloads once on its own, when a page file from the old version is gone', async () => {
    renderBroken(new TypeError('Failed to fetch dynamically imported module: https://x/assets/LearnPage-abc.js'));
    expect(await screen.findByRole('heading', { name: /kosha was updated/i })).toBeInTheDocument();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Reload Kosha' })).toBeInTheDocument();
  });

  it('does not reload again and again if the new version cannot be fetched either', async () => {
    renderBroken(new TypeError('Failed to fetch dynamically imported module: https://x/a.js'));
    await screen.findByRole('heading', { name: /kosha was updated/i });
    expect(reload).toHaveBeenCalledTimes(1);
    renderBroken(new TypeError('Failed to fetch dynamically imported module: https://x/a.js'));
    await screen.findAllByRole('heading', { name: /kosha was updated/i });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads when you press the button', async () => {
    sessionStorage.setItem('kosha-update-reload', String(Date.now()));
    renderBroken(new TypeError('Importing a module script failed.'));
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Reload Kosha' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('shows a plain message for any other error, never the raw React Router screen', async () => {
    renderBroken(new Error('Something exploded'));
    expect(await screen.findByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.queryByText(/unexpected application error/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to your overview/i })).toHaveAttribute('href', '/');
    expect(reload).not.toHaveBeenCalled();
  });
});
