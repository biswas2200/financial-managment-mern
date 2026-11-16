import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CookieConsentProvider, useCookieConsent } from './CookieConsentProvider.jsx';
import { CookieBanner } from './CookieBanner.jsx';
import { CONSENT_KEY, readConsent, saveConsent } from '../../lib/consent.js';

let me = null;
const mutate = vi.fn();
vi.mock('../../api/hooks.js', () => ({
  useMe: () => ({ data: me }),
  useSaveCookieChoice: () => ({ mutate, isPending: false }),
}));

const OLD = '2026-11-10T08:00:00.000Z';
const NEW = '2026-11-12T08:00:00.000Z';

function Probe() {
  const c = useCookieConsent();
  return (
    <p data-testid="state">
      {String(c.decided)}|{String(c.preferencesAllowed)}
    </p>
  );
}

const renderApp = (ui = <Probe />) =>
  render(
    <MemoryRouter>
      <CookieConsentProvider>
        {ui}
        <CookieBanner />
      </CookieConsentProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  me = null;
  mutate.mockReset();
});

describe('Cookie banner', () => {
  it('asks a visitor who has not chosen yet, in plain words, and says what is always used', () => {
    renderApp();
    const banner = screen.getByRole('region', { name: 'Cookies' });
    expect(banner).toHaveTextContent(/one cookie/i);
    expect(banner).toHaveTextContent(/keep you signed in/i);
    expect(banner).toHaveTextContent(/theme/i);
    expect(banner).toHaveTextContent(/no advertising or tracking/i);
    expect(within(banner).getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
  });

  it('has two equal choices, and "Essential only" is as easy to reach as "Accept all"', () => {
    renderApp();
    const accept = screen.getByRole('button', { name: 'Accept all' });
    const essential = screen.getByRole('button', { name: 'Essential only' });
    expect(accept).toBeEnabled();
    expect(essential).toBeEnabled();
  });

  it('accepting stores a yes, and the banner goes away', async () => {
    renderApp();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Accept all' }));
    expect(readConsent()).toMatchObject({ preferences: true });
    expect(screen.queryByRole('region', { name: 'Cookies' })).not.toBeInTheDocument();
    expect(screen.getByTestId('state')).toHaveTextContent('true|true');
  });

  it('choosing essential only stores a no, clears any optional items, and the banner goes away', async () => {
    localStorage.setItem('kosha-theme', 'dark');
    renderApp();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Essential only' }));
    expect(readConsent()).toMatchObject({ preferences: false });
    expect(localStorage.getItem('kosha-theme')).toBeNull();
    expect(screen.queryByRole('region', { name: 'Cookies' })).not.toBeInTheDocument();
    expect(screen.getByTestId('state')).toHaveTextContent('true|false');
  });

  it('does not appear again for someone who has already chosen', () => {
    saveConsent({ preferences: false });
    renderApp();
    expect(screen.queryByRole('region', { name: 'Cookies' })).not.toBeInTheDocument();
  });

  it('does not cover a control: it sits clear of the tab bar once you are signed in', () => {
    me = { id: 'u1', name: 'Aarav' };
    renderApp();
    expect(screen.getByRole('region', { name: 'Cookies' }).className).toMatch(/bottom-24/);
  });

  it('is not a trap: it never blocks the page behind it, and nothing is chosen for you by closing it', () => {
    renderApp();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(readConsent()).toBeNull();
  });
});

describe('Keeping the choice with the account', () => {
  it('does not contact the server for a visitor who is not signed in', async () => {
    renderApp();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Accept all' }));
    expect(mutate).not.toHaveBeenCalled();
  });

  it('sends the answer to the account when a signed-in person answers', async () => {
    me = { id: 'u1', name: 'Aarav' };
    renderApp();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Accept all' }));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate).toHaveBeenCalledWith({ preferences: true, decidedAt: readConsent().decidedAt }, expect.anything());
  });

  it('sends an answer given before signing in, once the person is signed in', async () => {
    saveConsent({ preferences: true, decidedAt: OLD });
    me = { id: 'u1', name: 'Aarav' };
    renderApp();
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate.mock.calls[0][0]).toEqual({ preferences: true, decidedAt: OLD });
  });

  it('takes the account\'s answer on a new device, so the banner does not ask again', async () => {
    me = { id: 'u1', name: 'Aarav', cookieConsent: { preferences: true, version: '2026-11-16', decidedAt: NEW } };
    renderApp();
    await waitFor(() => expect(readConsent()).toMatchObject({ preferences: true, decidedAt: NEW }));
    expect(mutate).not.toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: 'Cookies' })).not.toBeInTheDocument();
  });

  it('follows the account when the account\'s answer is newer than this device\'s', async () => {
    saveConsent({ preferences: true, decidedAt: OLD });
    localStorage.setItem('kosha-theme', 'dark');
    me = { id: 'u1', name: 'Aarav', cookieConsent: { preferences: false, version: '2026-11-16', decidedAt: NEW } };
    renderApp();
    await waitFor(() => expect(readConsent()).toMatchObject({ preferences: false, decidedAt: NEW }));
    expect(localStorage.getItem('kosha-theme')).toBeNull(); // a no elsewhere clears the optional items here too
    expect(mutate).not.toHaveBeenCalled();
  });

  it('pushes this device\'s answer when it is newer than the account\'s', async () => {
    saveConsent({ preferences: true, decidedAt: NEW });
    me = { id: 'u1', name: 'Aarav', cookieConsent: { preferences: false, version: '2026-11-16', decidedAt: OLD } };
    renderApp();
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate.mock.calls[0][0]).toEqual({ preferences: true, decidedAt: NEW });
  });

  it('does nothing more once the two agree, so it never loops', async () => {
    saveConsent({ preferences: true, decidedAt: NEW });
    me = { id: 'u1', name: 'Aarav', cookieConsent: { preferences: true, version: '2026-11-16', decidedAt: NEW } };
    renderApp();
    await act(async () => {});
    expect(mutate).not.toHaveBeenCalled();
    expect(localStorage.getItem(CONSENT_KEY)).toContain(NEW);
  });
});

describe('useCookieConsent outside the provider', () => {
  it('is a harmless "not decided" rather than a crash, so a screen can be tested on its own', () => {
    render(<Probe />);
    expect(screen.getByTestId('state')).toHaveTextContent('false|false');
  });
});
