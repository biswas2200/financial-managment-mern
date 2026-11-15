import { describe, it, expect } from 'vitest';
import { tiltFromPointer, easeOutCubic } from './motion.js';

const rect = { left: 100, top: 50, width: 400, height: 200 };

describe('tiltFromPointer', () => {
  it('is flat with the light in the middle when the pointer is centred', () => {
    expect(tiltFromPointer(rect, 300, 150)).toEqual({ rx: 0, ry: 0, gx: 50, gy: 50 });
  });

  it('tips the hovered corner towards the viewer', () => {
    const t = tiltFromPointer(rect, 100, 50, 10); // top-left corner
    expect(t.rx).toBe(10);
    expect(t.ry).toBe(-10);
    expect(t.gx).toBe(0);
    expect(t.gy).toBe(0);
  });

  it('clamps a pointer outside the element to the maximum tilt', () => {
    const t = tiltFromPointer(rect, 900, 900, 6);
    expect(t).toEqual({ rx: -6, ry: 6, gx: 100, gy: 100 });
  });

  it('stays flat for an element with no size yet', () => {
    expect(tiltFromPointer({ left: 0, top: 0, width: 0, height: 0 }, 10, 10)).toEqual({ rx: 0, ry: 0, gx: 50, gy: 50 });
  });
});

describe('easeOutCubic', () => {
  it('starts at 0, ends at 1 and moves fastest at the start', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
    expect(easeOutCubic(2)).toBe(1);
  });
});
