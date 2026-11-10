import {
  House,
  ShoppingBasket,
  Utensils,
  CarFront,
  ShoppingBag,
  Zap,
  Clapperboard,
  HeartPulse,
  Repeat,
  GraduationCap,
  Plane,
  Sparkles,
  Briefcase,
  Laptop,
  TrendingUp,
  Gift,
  RotateCcw,
  PawPrint,
  Circle,
  Receipt,
  Landmark,
  Wallet,
} from 'lucide-react';
import clsx from 'clsx';

/** Only the icons categories can use, so the bundle doesn't carry all of lucide. */
export const CATEGORY_ICONS = {
  house: House,
  'shopping-basket': ShoppingBasket,
  utensils: Utensils,
  'car-front': CarFront,
  'shopping-bag': ShoppingBag,
  zap: Zap,
  clapperboard: Clapperboard,
  'heart-pulse': HeartPulse,
  repeat: Repeat,
  'graduation-cap': GraduationCap,
  plane: Plane,
  sparkles: Sparkles,
  briefcase: Briefcase,
  laptop: Laptop,
  'trending-up': TrendingUp,
  gift: Gift,
  'rotate-ccw': RotateCcw,
  'paw-print': PawPrint,
  receipt: Receipt,
  landmark: Landmark,
  wallet: Wallet,
  circle: Circle,
};

/** Category glyph on a soft tint of the category colour. */
export function CategoryIcon({ icon, color = '#737b96', size = 'md', className }) {
  const Icon = CATEGORY_ICONS[icon] ?? Circle;
  const box = size === 'sm' ? 'h-7 w-7 rounded-lg' : size === 'lg' ? 'h-10 w-10 rounded-xl' : 'h-8 w-8 rounded-[10px]';
  const glyph = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;
  return (
    <span
      className={clsx('inline-flex shrink-0 items-center justify-center', box, className)}
      style={{ backgroundColor: `color-mix(in oklch, ${color} 16%, transparent)`, color: `color-mix(in oklch, ${color} 78%, var(--ink))` }}
      aria-hidden
    >
      <Icon size={glyph} strokeWidth={2} />
    </span>
  );
}
