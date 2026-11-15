import clsx from 'clsx';
import { Bird, Cat, Coffee, Crown, Dog, Fish, Flower2, Gem, Ghost, Heart, Leaf, Moon, Rocket, Smile, Star, Sun } from 'lucide-react';

/** The icons a person can pick as a profile picture. Keys match AVATAR_PRESETS in @kosha/shared. */
export const AVATAR_ICONS = {
  cat: Cat,
  dog: Dog,
  rocket: Rocket,
  leaf: Leaf,
  coffee: Coffee,
  star: Star,
  heart: Heart,
  smile: Smile,
  ghost: Ghost,
  bird: Bird,
  fish: Fish,
  flower: Flower2,
  sun: Sun,
  moon: Moon,
  gem: Gem,
  crown: Crown,
};

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

/** White or dark ink, whichever reads better on this background. */
function inkOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#2a1c00' : '#ffffff';
}

/**
 * A person's picture: their uploaded photo, a chosen icon on a colour, or their initials.
 * Decorative (the name is always shown beside it), so it is hidden from screen readers.
 */
export function Avatar({ user, size = 36, className, fallbackClassName }) {
  const avatar = user?.avatar;
  const box = { width: size, height: size };

  if (avatar?.type === 'image') {
    return <img data-avatar="photo" src={avatar.image} alt="" style={box} className={clsx('shrink-0 rounded-full object-cover', className)} />;
  }
  if (avatar?.type === 'preset') {
    const Icon = AVATAR_ICONS[avatar.preset] ?? Smile;
    return (
      <span
        data-avatar={avatar.preset}
        aria-hidden
        style={{ ...box, backgroundColor: avatar.color, color: inkOn(avatar.color) }}
        className={clsx('inline-flex shrink-0 items-center justify-center rounded-full shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_2px_6px_rgb(0_0_0/0.25)]', className)}
      >
        <Icon size={Math.round(size * 0.52)} strokeWidth={2} />
      </span>
    );
  }
  return (
    <span
      data-avatar="initials"
      aria-hidden
      style={{ ...box, fontSize: Math.max(11, Math.round(size * 0.36)) }}
      className={clsx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', fallbackClassName ?? 'bg-brand text-brand-ink', className)}
    >
      {initials(user?.name)}
    </span>
  );
}
