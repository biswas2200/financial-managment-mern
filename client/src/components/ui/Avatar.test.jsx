import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { AVATAR_PRESETS } from '@kosha/shared';
import { Avatar, AVATAR_ICONS } from './Avatar.jsx';

describe('Avatar', () => {
  it('has a picture for every icon the server accepts', () => {
    for (const name of AVATAR_PRESETS) expect(AVATAR_ICONS[name], name).toBeTruthy();
  });

  it('falls back to the initials of the name', () => {
    const { container } = render(<Avatar user={{ name: 'Aarav Mehta' }} />);
    const el = container.querySelector('[data-avatar]');
    expect(el).toHaveAttribute('data-avatar', 'initials');
    expect(el).toHaveTextContent('AM');
  });

  it('draws the chosen icon on its colour', () => {
    const { container } = render(<Avatar user={{ name: 'A', avatar: { type: 'preset', preset: 'rocket', color: '#eb6834' } }} />);
    const el = container.querySelector('[data-avatar]');
    expect(el).toHaveAttribute('data-avatar', 'rocket');
    expect(el.style.backgroundColor).toBe('rgb(235, 104, 52)');
    expect(el.querySelector('svg')).toBeInTheDocument();
  });

  it('shows an uploaded photo', () => {
    const image = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    const { container } = render(<Avatar user={{ name: 'A', avatar: { type: 'image', image } }} />);
    const img = container.querySelector('img[data-avatar="photo"]');
    expect(img).toHaveAttribute('src', image);
    expect(img).toHaveAttribute('alt', '');
  });

  it('copes with no user yet', () => {
    const { container } = render(<Avatar user={null} />);
    expect(container.querySelector('[data-avatar="initials"]')).toBeInTheDocument();
  });
});
