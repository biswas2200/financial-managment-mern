import { describe, it, expect } from 'vitest';
import {
  toMinor,
  fromMinor,
  formatMoney,
  sumMinor,
  percentChange,
  MAX_AMOUNT_MINOR,
} from '../src/money.js';

describe('toMinor: rupee input → integer paise', () => {
  it.each([
    ['0.01', 1],
    ['1', 100],
    ['1.5', 150],
    ['1234.50', 123450],
    ['  250 ', 25000],
    ['1,23,456.78', 12345678],
    [450, 45000],
    [99.99, 9999],
  ])('converts %j to %i paise', (input, expected) => {
    expect(toMinor(input)).toBe(expected);
  });

  it('avoids floating point drift (0.1 + 0.2 style inputs)', () => {
    expect(toMinor('0.3')).toBe(30);
    expect(toMinor('19.99') + toMinor('0.01')).toBe(2000);
  });

  it.each(['', 'abc', '-5', '1.234', '1e3', '12.', '.5.5', null, undefined, NaN, Infinity])(
    'rejects invalid amount %j',
    (input) => {
      expect(() => toMinor(input)).toThrow();
    },
  );

  it('rejects zero and amounts above the per-transaction cap', () => {
    expect(() => toMinor('0')).toThrow(/greater than zero/i);
    expect(() => toMinor(String(MAX_AMOUNT_MINOR / 100 + 1))).toThrow(/exceeds/i);
  });
});

describe('fromMinor: paise → fixed 2-decimal string', () => {
  it.each([
    [1, '0.01'],
    [150, '1.50'],
    [123450, '1234.50'],
    [0, '0.00'],
    [-2550, '-25.50'],
  ])('converts %i to %s', (minor, expected) => {
    expect(fromMinor(minor)).toBe(expected);
  });

  it('round-trips with toMinor', () => {
    for (const v of ['0.01', '7.10', '98765.43']) expect(fromMinor(toMinor(v))).toBe(v);
  });
});

describe('formatMoney', () => {
  it('uses Indian digit grouping and the rupee symbol', () => {
    expect(formatMoney(12345650)).toBe('₹1,23,456.50');
  });

  it('can drop paise for whole-number display', () => {
    expect(formatMoney(12345650, { decimals: 0 })).toBe('₹1,23,457');
  });

  it('formats negatives with a leading minus sign', () => {
    expect(formatMoney(-50000)).toBe('-₹500.00');
  });

  it('adds an explicit plus sign when asked', () => {
    expect(formatMoney(50000, { signed: true })).toBe('+₹500.00');
  });

  it('supports compact lakh/crore notation', () => {
    expect(formatMoney(12500000, { compact: true })).toBe('₹1.25L');
    expect(formatMoney(2500000000, { compact: true })).toBe('₹2.5Cr');
    expect(formatMoney(4500000, { compact: true })).toBe('₹45K');
  });
});

describe('sumMinor', () => {
  it('sums integer paise exactly', () => {
    expect(sumMinor([1999, 1, 50000])).toBe(52000);
  });

  it('returns 0 for an empty list', () => {
    expect(sumMinor([])).toBe(0);
  });

  it('throws if a non-integer sneaks in', () => {
    expect(() => sumMinor([100, 1.5])).toThrow();
  });
});

describe('percentChange', () => {
  it('computes signed change rounded to one decimal', () => {
    expect(percentChange(120, 100)).toBe(20);
    expect(percentChange(80, 100)).toBe(-20);
    expect(percentChange(1, 3)).toBe(-66.7);
  });

  it('returns null when the previous value is zero', () => {
    expect(percentChange(500, 0)).toBeNull();
  });
});
