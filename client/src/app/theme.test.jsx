import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from './theme.jsx';
import { saveConsent } from '../lib/consent.js';

function Buttons() {
  const { preference, setTheme } = useTheme();
  return (
    <>
      <p data-testid="pref">{preference}</p>
      <button onClick={() => setTheme('dark')}>dark</button>
      <button onClick={() => setTheme('light')}>light</button>
    </>
  );
}
const renderTheme = () =>
  render(
    <ThemeProvider>
      <Buttons />
    </ThemeProvider>,
  );

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('Theme and the cookie choice', () => {
  it('still switches the theme for this visit before anyone has chosen, but stores nothing', async () => {
    renderTheme();
    await userEvent.setup().click(screen.getByRole('button', { name: 'dark' }));
    expect(screen.getByTestId('pref')).toHaveTextContent('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('kosha-theme')).toBeNull();
  });

  it('remembers the theme once the person has said yes to preferences', async () => {
    saveConsent({ preferences: true });
    renderTheme();
    await userEvent.setup().click(screen.getByRole('button', { name: 'dark' }));
    expect(localStorage.getItem('kosha-theme')).toBe('dark');
  });

  it('starts from the remembered theme only when preferences are allowed', () => {
    localStorage.setItem('kosha-theme', 'dark');
    const { unmount } = renderTheme();
    expect(screen.getByTestId('pref')).toHaveTextContent('system');
    unmount();
    saveConsent({ preferences: true });
    localStorage.setItem('kosha-theme', 'dark');
    renderTheme();
    expect(screen.getByTestId('pref')).toHaveTextContent('dark');
  });

  it('saves a theme chosen before the yes, as soon as the yes comes', async () => {
    renderTheme();
    await userEvent.setup().click(screen.getByRole('button', { name: 'dark' }));
    expect(localStorage.getItem('kosha-theme')).toBeNull();
    act(() => {
      saveConsent({ preferences: true });
    });
    expect(localStorage.getItem('kosha-theme')).toBe('dark');
  });

  it('forgets the stored theme on a no, but keeps the theme on screen for this visit', async () => {
    saveConsent({ preferences: true });
    renderTheme();
    await userEvent.setup().click(screen.getByRole('button', { name: 'dark' }));
    act(() => {
      saveConsent({ preferences: false });
    });
    expect(localStorage.getItem('kosha-theme')).toBeNull();
    expect(screen.getByTestId('pref')).toHaveTextContent('dark');
  });
});
