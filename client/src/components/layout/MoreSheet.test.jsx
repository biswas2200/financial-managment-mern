import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { MoreSheet } from './MoreSheet.jsx';
import { NAV_SECTIONS, SETTINGS_ITEM } from './nav.js';

const renderSheet = (props = {}) => {
  const onClose = vi.fn();
  render(
    <MemoryRouter>
      <MoreSheet open onClose={onClose} {...props} />
    </MemoryRouter>,
  );
  return onClose;
};

describe('MoreSheet', () => {
  it('lists every place in the app, grouped by domain, including Settings', () => {
    renderSheet();
    const dialog = screen.getByRole('dialog', { name: 'More' });
    for (const name of ['Analytics', 'Budgets', 'Stocks', 'Mutual funds', 'Watchlist', 'Learn', 'Discussions', 'Settings']) {
      expect(within(dialog).getByRole('link', { name })).toBeInTheDocument();
    }
    expect(within(dialog).getByRole('link', { name: 'Learn' })).toHaveAttribute('href', '/learn');
    expect(within(dialog).getByText('Invest')).toBeInTheDocument();
  });

  it('draws every icon in its own colour, on a tinted chip', () => {
    renderSheet();
    const dialog = screen.getByRole('dialog', { name: 'More' });
    for (const item of [...NAV_SECTIONS.flatMap((s) => s.items), SETTINGS_ITEM]) {
      const chip = within(dialog).getByRole('link', { name: item.label }).querySelector('[data-icon-chip]');
      expect(chip, item.label).toBeInTheDocument();
      expect(chip).toHaveStyle({ color: item.color });
    }
  });

  it('lays the places out four to a row, so the whole sheet fits a phone without scrolling', () => {
    renderSheet();
    for (const list of screen.getByRole('dialog', { name: 'More' }).querySelectorAll('ul')) expect(list.className).toMatch(/grid-cols-4/);
  });

  it('keeps its title and close button in view while the list scrolls', () => {
    renderSheet();
    const header = screen.getByRole('heading', { name: 'More' }).closest('header');
    expect(header.className).toMatch(/sticky/);
    expect(screen.getByRole('dialog', { name: 'More' }).className).toMatch(/overscroll-contain/);
  });

  it('closes when you pick a place', async () => {
    const onClose = renderSheet();
    await userEvent.setup().click(screen.getByRole('link', { name: 'Budgets' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Escape and on the close button', async () => {
    const onClose = renderSheet();
    fireEvent(screen.getByRole('dialog', { name: 'More' }), new Event('cancel', { cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('shows nothing when it is closed', () => {
    renderSheet({ open: false });
    expect(screen.queryByRole('link', { name: 'Budgets' })).not.toBeInTheDocument();
  });
});
