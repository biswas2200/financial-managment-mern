import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { COOKIE_INVENTORY } from '@kosha/shared';
import { CookieConsentProvider } from './CookieConsentProvider.jsx';
import { CookieSettings } from './CookieSettings.jsx';
import { readConsent, saveConsent } from '../../lib/consent.js';

let me = { id: 'u1', name: 'Aarav' };
vi.mock('../../api/hooks.js', () => ({
  useMe: () => ({ data: me }),
  useSaveCookieChoice: () => ({ mutate: vi.fn(), isPending: false }),
}));

const renderSettings = () =>
  render(
    <MemoryRouter>
      <CookieConsentProvider>
        <CookieSettings />
      </CookieConsentProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  me = { id: 'u1', name: 'Aarav' };
});

describe('Cookie settings', () => {
  it('lists everything Kosha keeps on a device, grouped as essential and preferences, from the one shared list', () => {
    renderSettings();
    const region = screen.getByRole('region', { name: 'Cookies and device storage' });
    for (const item of COOKIE_INVENTORY) expect(within(region).getByText(item.name), item.name).toBeInTheDocument();
    expect(within(region).getByRole('heading', { name: 'Essential' })).toBeInTheDocument();
    expect(within(region).getByRole('heading', { name: 'Preferences' })).toBeInTheDocument();
    expect(region).toHaveTextContent(/no advertising/i);
  });

  it('says plainly when you have not chosen yet', () => {
    renderSettings();
    expect(screen.getByText(/have not chosen yet/i)).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /remember my choices on this device/i })).not.toBeChecked();
  });

  it('turns preferences on and off, and the choice is saved', async () => {
    const user = userEvent.setup();
    renderSettings();
    const toggle = screen.getByRole('switch', { name: /remember my choices on this device/i });
    await user.click(toggle);
    expect(toggle).toBeChecked();
    expect(readConsent()).toMatchObject({ preferences: true });
    await user.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(readConsent()).toMatchObject({ preferences: false });
  });

  it('says that the choice is kept with the account once it has reached the server', () => {
    saveConsent({ preferences: true, decidedAt: '2026-11-12T08:00:00.000Z' });
    me = { id: 'u1', name: 'Aarav', cookieConsent: { preferences: true, version: '2026-11-16', decidedAt: '2026-11-12T08:00:00.000Z' } };
    renderSettings();
    expect(screen.getByText(/kept with your account/i)).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /remember my choices on this device/i })).toBeChecked();
  });

  it('says when the choice is only on this device so far', () => {
    saveConsent({ preferences: true });
    renderSettings();
    expect(screen.getByText(/only on this device so far/i)).toBeInTheDocument();
  });

  it('shows the essential items as always on, with nothing to switch', () => {
    renderSettings();
    expect(screen.queryByRole('switch', { name: /essential/i })).not.toBeInTheDocument();
    expect(screen.getAllByText(/always on/i).length).toBeGreaterThan(0);
  });
});
