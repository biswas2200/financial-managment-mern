import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Reactions } from './Reactions.jsx';

const setup = (props = {}) => {
  const onChange = vi.fn();
  render(<Reactions likes={12} dislikes={3} myReaction={null} onChange={onChange} {...props} />);
  return onChange;
};

describe('Reactions', () => {
  it('shows likes and dislikes as two separate counts', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Like, 12' })).toHaveTextContent('12');
    expect(screen.getByRole('button', { name: 'Dislike, 3' })).toHaveTextContent('3');
  });

  it('never shows a minus sign or a negative count', () => {
    setup({ likes: -5, dislikes: -1 });
    expect(screen.getByRole('button', { name: 'Like, 0' })).toHaveTextContent('0');
    expect(screen.getByRole('button', { name: 'Dislike, 0' })).toHaveTextContent('0');
    expect(document.body.textContent).not.toMatch(/-\d/);
  });

  it('shortens big numbers', () => {
    setup({ likes: 1250, dislikes: 2_000_000 });
    expect(screen.getByRole('button', { name: 'Like, 1.2k' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dislike, 2M' })).toBeInTheDocument();
  });

  it('marks which one you chose', () => {
    setup({ myReaction: 'dislike' });
    expect(screen.getByRole('button', { name: /^Dislike/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^Like/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('sends the reaction you pick, and null when you pick the same one again', async () => {
    const user = userEvent.setup();
    const onChange = setup();
    await user.click(screen.getByRole('button', { name: /^Like/ }));
    expect(onChange).toHaveBeenLastCalledWith('like');
    await user.click(screen.getByRole('button', { name: /^Dislike/ }));
    expect(onChange).toHaveBeenLastCalledWith('dislike');
  });

  it('takes a reaction back when you press the active one', async () => {
    const user = userEvent.setup();
    const onChange = setup({ myReaction: 'like' });
    await user.click(screen.getByRole('button', { name: /^Like/ }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('can be switched off while a request is in flight', async () => {
    const user = userEvent.setup();
    const onChange = setup({ disabled: true });
    await user.click(screen.getByRole('button', { name: /^Like/ }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /^Like/ })).toBeDisabled();
  });
});
