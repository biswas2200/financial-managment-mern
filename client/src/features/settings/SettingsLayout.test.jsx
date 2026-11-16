import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '../../app/theme.jsx';
import { ToastProvider } from '../../components/ui/toast.jsx';
import SettingsLayout from './SettingsLayout.jsx';
import ProfileSettings from './ProfileSettings.jsx';
import PreferencesSettings from './PreferencesSettings.jsx';
import CategoriesSettings from './CategoriesSettings.jsx';
import PrivacySettings from './PrivacySettings.jsx';

vi.mock('../../api/hooks.js', () => {
  const mutation = () => ({ mutate: vi.fn(), isPending: false });
  return {
    useMe: () => ({ data: { id: 'u1', name: 'Aarav Mehta', email: 'demo@kosha.app' } }),
    useUpdateProfile: mutation,
    useChangePassword: mutation,
    useDeleteAccount: mutation,
    useCategories: () => ({ isLoading: false, data: [{ id: 'c1', name: 'Groceries', type: 'expense', icon: 'shopping-basket', color: '#eb6834', transactionCount: 2, totalAmount: 50000 }] }),
    useSaveCategory: mutation,
    useDeleteCategory: mutation,
    useAssistantStatus: () => ({ data: { provider: 'offline' } }),
  };
});

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider>
        <ToastProvider>
          <Routes>
            <Route path="settings" element={<SettingsLayout />}>
              <Route index element={<ProfileSettings />} />
              <Route path="preferences" element={<PreferencesSettings />} />
              <Route path="categories" element={<CategoriesSettings />} />
              <Route path="privacy" element={<PrivacySettings />} />
            </Route>
          </Routes>
        </ToastProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('SettingsLayout', () => {
  it('is split into separate pages with a link to each', () => {
    renderAt('/settings');
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    const tabs = within(screen.getByRole('navigation', { name: 'Settings sections' }));
    expect(tabs.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/settings');
    expect(tabs.getByRole('link', { name: 'Preferences' })).toHaveAttribute('href', '/settings/preferences');
    expect(tabs.getByRole('link', { name: 'Categories' })).toHaveAttribute('href', '/settings/categories');
    expect(tabs.getByRole('link', { name: 'Privacy & data' })).toHaveAttribute('href', '/settings/privacy');
  });

  it('marks the page you are on', () => {
    renderAt('/settings/categories');
    const tabs = within(screen.getByRole('navigation', { name: 'Settings sections' }));
    expect(tabs.getByRole('link', { name: 'Categories' })).toHaveAttribute('aria-current', 'page');
    expect(tabs.getByRole('link', { name: 'Profile' })).not.toHaveAttribute('aria-current');
  });

  it('keeps the long category list off the profile page', () => {
    renderAt('/settings');
    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.queryByText('Expense categories')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Privacy and your data' })).not.toBeInTheDocument();
  });

  it('opens a page when you pick its link', async () => {
    renderAt('/settings');
    await userEvent.setup().click(screen.getByRole('link', { name: 'Categories' }));
    expect(await screen.findByText('Expense categories')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Profile' })).not.toBeInTheDocument();
  });
});
