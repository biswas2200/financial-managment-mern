import { describe, it, expect } from 'vitest';
import { DEFAULT_CATEGORIES } from '@kosha/shared';
import { CATEGORY_ICONS } from './CategoryIcon.jsx';

describe('category icons', () => {
  it('has a picture for every default category', () => {
    for (const c of DEFAULT_CATEGORIES) expect(CATEGORY_ICONS[c.icon], `${c.name} uses "${c.icon}"`).toBeTruthy();
  });

  it('offers plenty to choose from for your own categories', () => {
    expect(Object.keys(CATEGORY_ICONS).length).toBeGreaterThanOrEqual(50);
  });

  it('includes everyday spending that the defaults do not cover', () => {
    for (const name of ['coffee', 'dumbbell', 'baby', 'fuel', 'wifi', 'shirt', 'pill', 'gamepad', 'music', 'camera']) {
      expect(CATEGORY_ICONS[name], name).toBeTruthy();
    }
  });
});
