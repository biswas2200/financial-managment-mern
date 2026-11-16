import { describe, it, expect } from 'vitest';
import { timeAgo } from './format.js';

const now = new Date('2026-11-16T10:00:00Z');
const ago = (ms) => new Date(now.getTime() - ms);

describe('timeAgo', () => {
  it('says "just now" for the last minute, and never shows a future time as negative', () => {
    expect(timeAgo(ago(20_000), now)).toBe('just now');
    expect(timeAgo(new Date(now.getTime() + 60_000), now)).toBe('just now');
  });

  it('counts minutes, hours and days', () => {
    expect(timeAgo(ago(5 * 60_000), now)).toBe('5 min ago');
    expect(timeAgo(ago(3 * 3_600_000), now)).toBe('3 h ago');
    expect(timeAgo(ago(2 * 86_400_000), now)).toBe('2 d ago');
  });

  it('switches to a date after a week', () => {
    expect(timeAgo(ago(10 * 86_400_000), now)).toMatch(/\d{1,2} \w{3} 2026/);
  });
});
