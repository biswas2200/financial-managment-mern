import { describe, it, expect } from 'vitest';
import { timeAgo, rupees, level, crore, integer } from './format.js';

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


describe('market number formats', () => {
  it('writes prices in rupees with Indian digit grouping', () => {
    expect(rupees(1339.7)).toBe('₹1,339.70');
    expect(rupees(1234567.8)).toBe('₹12,34,567.80');
    expect(rupees(25, { decimals: 0 })).toBe('₹25');
    expect(rupees(177.162, { decimals: 4 })).toBe('₹177.1620');
  });

  it('writes index levels without a rupee sign', () => {
    expect(level(25144.3)).toBe('25,144.30');
    expect(level(61034.1)).toBe('61,034.10');
  });

  it('writes traded value in crore', () => {
    expect(crore(1879.14)).toBe('₹1,879 Cr');
    expect(crore(0.85)).toBe('₹0.85 Cr');
    expect(crore(12.5)).toBe('₹12.5 Cr');
  });

  it('shows a dash for missing figures instead of NaN', () => {
    for (const fn of [rupees, level, crore, integer]) {
      expect(fn(null)).toBe('–');
      expect(fn(undefined)).toBe('–');
      expect(fn(NaN)).toBe('–');
    }
  });

  it('groups whole numbers the Indian way', () => {
    expect(integer(1200000)).toBe('12,00,000');
    expect(integer(939)).toBe('939');
  });
});
