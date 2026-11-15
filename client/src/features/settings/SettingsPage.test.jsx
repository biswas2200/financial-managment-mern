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
    useCategories: () => ({ data: [], isLoading: false }),
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

  it('has password fields with a show/hide toggle', async () => {
    renderPage();
    const current = screen.getByLabelText('Current password');
    expect(current).toHaveAttribute('type', 'password');
    await userEvent.setup().click(screen.getAllByRole('button', { name: 'Show password' })[0]);
    expect(current).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('New password')).toHaveAttribute('type', 'password');
  });
});
