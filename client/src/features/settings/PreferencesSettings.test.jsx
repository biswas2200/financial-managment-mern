import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../app/theme.jsx';
import PreferencesSettings from './PreferencesSettings.jsx';

let status = { provider: 'offline' };
vi.mock('../../api/hooks.js', () => ({ useAssistantStatus: () => ({ data: status }) }));

const renderPage = () =>
  render(
    <MemoryRouter>
      <ThemeProvider>
        <PreferencesSettings />
      </ThemeProvider>
    </MemoryRouter>,
  );

describe('PreferencesSettings', () => {
  it('lets you pick a theme', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Appearance' })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('radio', { name: 'Dark' }));
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
  });

  it('says honestly which engine answers Copilot', () => {
    status = { provider: 'offline' };
    const { unmount } = renderPage();
    expect(screen.getByRole('heading', { name: 'Copilot engine' })).toBeInTheDocument();
    expect(screen.getByText(/built-in offline engine/i)).toBeInTheDocument();
    unmount();

    status = { provider: 'gemini', model: 'gemini-2.5-flash', auth: 'adc' };
    renderPage();
    expect(screen.getByText(/Application Default Credentials/i)).toBeInTheDocument();
  });
});
