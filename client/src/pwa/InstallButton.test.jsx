import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InstallButton } from './InstallButton.jsx';

function firePrompt(outcome = 'accepted') {
  const event = new Event('beforeinstallprompt');
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome });
  act(() => window.dispatchEvent(event));
  return event;
}

describe('InstallButton', () => {
  it('stays hidden until the browser says Kosha can be installed', () => {
    render(<InstallButton />);
    expect(screen.queryByRole('button', { name: /install kosha/i })).toBeNull();
  });

  it('opens the browser install prompt when clicked, then hides', async () => {
    render(<InstallButton />);
    const event = firePrompt();
    const button = await screen.findByRole('button', { name: 'Install Kosha app' });
    await userEvent.click(button);
    expect(event.prompt).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Install Kosha app' })).toBeNull();
  });

  it('hides once the app is installed', async () => {
    render(<InstallButton />);
    firePrompt();
    await screen.findByRole('button', { name: 'Install Kosha app' });
    act(() => window.dispatchEvent(new Event('appinstalled')));
    expect(screen.queryByRole('button', { name: 'Install Kosha app' })).toBeNull();
  });
});
