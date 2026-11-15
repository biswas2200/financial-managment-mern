import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AccountMenu } from './AccountMenu.jsx';

const user = { name: 'Amitosh Biswas', email: 'amitosh@example.com' };

function setup() {
  const onSignOut = vi.fn();
  render(
    <MemoryRouter>
      <AccountMenu user={user} onSignOut={onSignOut} />
    </MemoryRouter>,
  );
  return { onSignOut, u: userEvent.setup() };
}

describe('AccountMenu (mobile header)', () => {
  it('is closed until the avatar is pressed', async () => {
    const { u } = setup();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: /account menu/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Amitosh Biswas')).toBeInTheDocument();
    expect(screen.getByText('amitosh@example.com')).toBeInTheDocument();
  });

  it('links to settings and offers a theme switch', async () => {
    const { u } = setup();
    await u.click(screen.getByRole('button', { name: /account menu/i }));
    expect(screen.getByRole('menuitem', { name: /settings/i })).toHaveAttribute('href', '/settings');
    expect(screen.getByRole('menuitem', { name: /theme/i })).toBeInTheDocument();
  });

  it('signs out', async () => {
    const { u, onSignOut } = setup();
    await u.click(screen.getByRole('button', { name: /account menu/i }));
    await u.click(screen.getByRole('menuitem', { name: /sign out/i }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('closes with Escape and returns focus to the avatar', async () => {
    const { u } = setup();
    const trigger = screen.getByRole('button', { name: /account menu/i });
    await u.click(trigger);
    await u.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
