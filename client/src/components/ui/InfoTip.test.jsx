import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InfoTip } from './InfoTip.jsx';
import { PasswordInput } from './PasswordInput.jsx';

describe('InfoTip', () => {
  it('explains a term on focus and hides on Escape', async () => {
    const u = userEvent.setup();
    render(<InfoTip label="Savings rate">Share of this month’s income you kept.</InfoTip>);
    const button = screen.getByRole('button', { name: /what is savings rate/i });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    await u.tab();
    expect(button).toHaveFocus();
    const tip = screen.getByRole('tooltip');
    expect(tip).toHaveTextContent('Share of this month’s income you kept.');
    expect(button).toHaveAttribute('aria-describedby', tip.id);

    await u.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});

describe('PasswordInput', () => {
  it('lets the user show and hide what they typed', async () => {
    const u = userEvent.setup();
    render(<PasswordInput aria-label="Password" />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');

    await u.click(screen.getByRole('button', { name: /show password/i }));
    expect(input).toHaveAttribute('type', 'text');
    await u.click(screen.getByRole('button', { name: /hide password/i }));
    expect(input).toHaveAttribute('type', 'password');
  });
});
