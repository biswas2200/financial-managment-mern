import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../app/theme.jsx';
import { Sidebar } from './Sidebar.jsx';

vi.mock('../../api/hooks.js', () => ({
  useMe: () => ({ data: { id: 'u1', name: 'Aarav Mehta', email: 'demo@kosha.app' } }),
  useLogout: () => ({ mutate: vi.fn() }),
}));

const renderSidebar = (props = {}) => {
  const onAdd = vi.fn();
  const onShortcuts = vi.fn();
  render(
    <MemoryRouter>
      <ThemeProvider>
        <Sidebar onAdd={onAdd} onShortcuts={onShortcuts} {...props} />
      </ThemeProvider>
    </MemoryRouter>,
  );
  return { onAdd, onShortcuts };
};

describe('Sidebar', () => {
  it('has the logo, both Add buttons, every domain, Settings, shortcuts and who is signed in', () => {
    renderSidebar();
    const aside = screen.getByRole('complementary');
    expect(within(aside).getByText('Kosha')).toBeInTheDocument();
    expect(within(aside).getByRole('button', { name: /Add expense/ })).toBeInTheDocument();
    expect(within(aside).getByRole('button', { name: /Add income/ })).toBeInTheDocument();
    for (const group of ['Money', 'Invest', 'Learn & talk', 'Assistant']) expect(within(aside).getByRole('group', { name: group })).toBeInTheDocument();
    expect(within(aside).getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
    expect(within(aside).getByText('Aarav Mehta')).toBeInTheDocument();
    expect(within(aside).getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('starts the quick-add forms and the shortcuts list', async () => {
    const { onAdd, onShortcuts } = renderSidebar();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Add expense/ }));
    expect(onAdd).toHaveBeenLastCalledWith('expense');
    await user.click(screen.getByRole('button', { name: /Add income/ }));
    expect(onAdd).toHaveBeenLastCalledWith('income');
    await user.click(screen.getByRole('button', { name: /Keyboard shortcuts/ }));
    expect(onShortcuts).toHaveBeenCalled();
  });

  it('scrolls as one piece, from the logo to your name, instead of only the links in the middle', () => {
    renderSidebar();
    const aside = screen.getByRole('complementary');
    expect(aside.className).toMatch(/overflow-y-auto/);
    expect(aside.className).toMatch(/h-dvh/);
    expect(aside.className).toMatch(/overscroll-contain/);
  });

  it('fades at the bottom while there is more below, and not once you have reached the end', () => {
    renderSidebar();
    const aside = screen.getByRole('complementary');
    const set = (v) => Object.entries(v).forEach(([k, val]) => Object.defineProperty(aside, k, { configurable: true, value: val }));
    set({ scrollHeight: 1000, clientHeight: 700, scrollTop: 0 });
    fireEvent.scroll(aside);
    expect(aside).toHaveAttribute('data-more', 'true');
    set({ scrollTop: 300 });
    fireEvent.scroll(aside);
    expect(aside).toHaveAttribute('data-more', 'false');
  });
});
