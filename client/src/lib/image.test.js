import { describe, it, expect } from 'vitest';
import { coverCrop } from './image.js';

describe('coverCrop (centre-crop to a square)', () => {
  it('takes the middle of a wide photo', () => {
    expect(coverCrop(1600, 900)).toEqual({ sx: 350, sy: 0, side: 900 });
  });

  it('takes the middle of a tall photo', () => {
    expect(coverCrop(900, 1600)).toEqual({ sx: 0, sy: 350, side: 900 });
  });

  it('keeps a square as it is', () => {
    expect(coverCrop(500, 500)).toEqual({ sx: 0, sy: 0, side: 500 });
  });
});
