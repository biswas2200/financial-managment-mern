import { describe, it, expect } from 'vitest';
import { watchSchema, formatPct, trend, MAX_WATCHLIST, WATCH_KINDS } from '../src/markets.js';

describe('watchSchema', () => {
  it('accepts a stock, an index or a fund', () => {
    for (const kind of WATCH_KINDS) expect(watchSchema.safeParse({ kind, ref: 'X' }).success, kind).toBe(true);
  });

  it('rejects other kinds and empty or very long names', () => {
    expect(watchSchema.safeParse({ kind: 'crypto', ref: 'BTC' }).success).toBe(false);
    expect(watchSchema.safeParse({ kind: 'stock', ref: '  ' }).success).toBe(false);
    expect(watchSchema.safeParse({ kind: 'stock' }).success).toBe(false);
    expect(watchSchema.safeParse({ kind: 'stock', ref: 'x'.repeat(81) }).success).toBe(false);
  });

  it('limits a list to 50', () => {
    expect(MAX_WATCHLIST).toBe(50);
  });
});

describe('formatPct and trend', () => {
  it('shows a sign on moves and none on zero', () => {
    expect(formatPct(1.234)).toBe('+1.23%');
    expect(formatPct(-0.61)).toBe('-0.61%');
    expect(formatPct(0)).toBe('0.00%');
    expect(formatPct(2, { signed: false })).toBe('2.00%');
  });

  it('shows a dash where there is no figure', () => {
    for (const v of [null, undefined, NaN, 'abc']) expect(formatPct(v), String(v)).toBe('–');
  });

  it('names the direction', () => {
    expect(trend(0.1)).toBe('up');
    expect(trend(-0.1)).toBe('down');
    expect(trend(0)).toBe('flat');
    expect(trend(null)).toBe('flat');
  });
});
