import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { MobileTabBar } from './MobileTabBar.jsx';
import { MOBILE_TABS } from './nav.js';

const renderBar = (path = '/', props = {}) => {
  const onMore = vi.fn();
  render(
    <MemoryRouter initialEntries={[path]}>
      <MobileTabBar onMore={onMore} moreOpen={false} {...props} />
    </MemoryRouter>,
  );
  return onMore;
};

describe('MobileTabBar', () => {
  it('has the four everyday places and a More button', () => {
    renderBar();
    const bar = screen.getByRole('navigation', { name: 'Main' });
    for (const tab of MOBILE_TABS) expect(within(bar).getByRole('link', { name: tab.label })).toHaveAttribute('href', tab.to);
    expect(within(bar).getByRole('button', { name: 'More' })).toBeInTheDocument();
  });

  it('draws each icon in its own colour', () => {
    renderBar();
    for (const tab of MOBILE_TABS) {
      const icon = screen.getByRole('link', { name: tab.label }).querySelector('svg');
      expect(icon, tab.label).toHaveStyle({ color: tab.color });
    }
  });

  it('lights the page you are on, and More when you are on a page that lives in it', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/markets']}>
        <MobileTabBar onMore={() => {}} moreOpen={false} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Markets' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'More' }).className).not.toMatch(/text-brand/);
    unmount();
    renderBar('/learn');
    expect(screen.getByRole('button', { name: 'More' }).className).toMatch(/text-brand/);
  });

  it('opens More, and says whether it is open', async () => {
    const onMore = renderBar('/', { moreOpen: true });
    const more = screen.getByRole('button', { name: 'More' });
    expect(more).toHaveAttribute('aria-expanded', 'true');
    expect(more).toHaveAttribute('aria-haspopup', 'dialog');
    await userEvent.setup().click(more);
    expect(onMore).toHaveBeenCalled();
  });
});
