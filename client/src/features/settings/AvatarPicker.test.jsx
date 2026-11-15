import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AvatarPicker } from './AvatarPicker.jsx';

const toDataUrl = vi.fn();
vi.mock('../../lib/image.js', async (importOriginal) => ({ ...(await importOriginal()), fileToAvatarDataUrl: (...a) => toDataUrl(...a) }));

const user0 = { name: 'Aarav Mehta' };

function setup(value = null) {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(<AvatarPicker name={user0.name} value={value} onChange={onChange} />);
  return { onChange, user };
}

describe('AvatarPicker', () => {
  beforeEach(() => {
    toDataUrl.mockReset();
  });

  it('offers a grid of icons, and picking one chooses it with the current colour', async () => {
    const { onChange, user } = setup();
    expect(screen.getAllByRole('button', { name: /^Use the .+ icon$/ }).length).toBeGreaterThanOrEqual(16);
    await user.click(screen.getByRole('button', { name: 'Use the rocket icon' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ type: 'preset', preset: 'rocket', color: expect.stringMatching(/^#[0-9a-f]{6}$/i) }));
  });

  it('changing the colour keeps the icon', async () => {
    const { onChange, user } = setup({ type: 'preset', preset: 'leaf', color: '#2c3a8f' });
    await user.click(screen.getByRole('button', { name: 'Background #eb6834' }));
    expect(onChange).toHaveBeenCalledWith({ type: 'preset', preset: 'leaf', color: '#eb6834' });
  });

  it('marks the chosen icon', () => {
    setup({ type: 'preset', preset: 'leaf', color: '#2c3a8f' });
    expect(screen.getByRole('button', { name: 'Use the leaf icon' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Use the rocket icon' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('uploads your own photo, shrunk first', async () => {
    toDataUrl.mockResolvedValue('data:image/jpeg;base64,AAAA');
    const { onChange, user } = setup();
    const file = new File(['x'], 'me.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Upload a photo'), file);
    expect(toDataUrl).toHaveBeenCalledWith(file);
    expect(onChange).toHaveBeenCalledWith({ type: 'image', image: 'data:image/jpeg;base64,AAAA' });
  });

  it('says so when the photo cannot be used', async () => {
    toDataUrl.mockRejectedValue(new Error('That file is not a picture we can read.'));
    const { onChange, user } = setup();
    await user.upload(screen.getByLabelText('Upload a photo'), new File(['x'], 'me.png', { type: 'image/png' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/not a picture we can read/i);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('goes back to initials', async () => {
    const { onChange, user } = setup({ type: 'preset', preset: 'leaf', color: '#2c3a8f' });
    await user.click(screen.getByRole('button', { name: 'Use my initials' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('shows a preview of what you are choosing', () => {
    const { container } = render(<AvatarPicker name="Aarav Mehta" value={{ type: 'preset', preset: 'cat', color: '#2c3a8f' }} onChange={() => {}} />);
    expect(container.querySelector('[data-avatar="cat"]')).toBeInTheDocument();
  });
});
