import { describe, it, expect } from 'vitest';
import { makeInk, mulberry32 } from './ink.js';

const numbers = (d) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

describe('seeded randomness', () => {
  it('gives the same sequence for the same seed and a different one for another', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(mulberry32(8)()).not.toBe(mulberry32(7)());
  });

  it('stays between 0 and 1', () => {
    const r = mulberry32(3);
    for (let i = 0; i < 500; i += 1) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('hand-drawn strokes', () => {
  it('draws the same picture every time for the same seed', () => {
    expect(makeInk(5).line(0, 0, 100, 40)).toBe(makeInk(5).line(0, 0, 100, 40));
    expect(makeInk(5).line(0, 0, 100, 40)).not.toBe(makeInk(6).line(0, 0, 100, 40));
  });

  it('wobbles a line a little, but keeps it near the straight path', () => {
    const d = makeInk(2).line(10, 20, 210, 20);
    expect(d.startsWith('M')).toBe(true);
    expect(d).not.toMatch(/NaN|undefined|Infinity/);
    const ys = numbers(d).filter((_, i) => i % 2 === 1);
    for (const y of ys) expect(Math.abs(y - 20)).toBeLessThan(2.5);
    expect(new Set(ys).size).toBeGreaterThan(2); // not ruler-straight
  });

  it('handles a zero-length line without dividing by zero', () => {
    expect(makeInk(1).line(5, 5, 5, 5)).not.toMatch(/NaN/);
  });

  it('builds closed shapes', () => {
    const ink = makeInk(1);
    for (const d of [ink.rect(0, 0, 10, 10), ink.arch(50, 100, 10, 80), ink.dome(50, 100, 12), ink.circle(30, 30, 8), ink.onion(40, 100, 8, 24), ink.poly([[0, 0], [10, 0], [5, 8]], true)]) {
      expect(d).not.toMatch(/NaN|undefined|Infinity/);
      expect(d.trim().endsWith('Z')).toBe(true);
    }
  });

  it('makes a wave that can slide by exactly one period without a visible jump', () => {
    const d = makeInk(1).wave(0, 120, 10, 24, 3);
    expect(d.startsWith('M0,10')).toBe(true);
    expect(d).not.toMatch(/NaN/);
    // 120 wide with a 24 period: five repeats
    expect((d.match(/t/g) ?? []).length).toBe(4);
  });
});
