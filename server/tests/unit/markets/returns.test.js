import { describe, it, expect } from 'vitest';
import {
  pctChange,
  cagr,
  shiftMonths,
  shiftDays,
  valueOnOrBefore,
  periodReturns,
  maxDrawdown,
  positiveWindowShare,
  downsample,
  STOCK_PERIODS,
  INDEX_PERIODS,
} from '../../../src/markets/returns.js';

describe('pctChange and cagr', () => {
  it('works out the percentage move, rounded to two places', () => {
    expect(pctChange(110, 100)).toBe(10);
    expect(pctChange(95, 100)).toBe(-5);
    expect(pctChange(100.123, 100)).toBe(0.12);
  });

  it('is null when there is nothing to compare with', () => {
    expect(pctChange(100, 0)).toBeNull();
    expect(pctChange(100, null)).toBeNull();
    expect(pctChange(undefined, 100)).toBeNull();
  });

  it('annualises over several years', () => {
    expect(cagr(200, 100, 5)).toBe(14.87); // 2^(1/5) - 1
    expect(cagr(133.1, 100, 3)).toBe(10);
    expect(cagr(50, 100, 2)).toBe(-29.29);
    expect(cagr(100, 0, 3)).toBeNull();
  });
});

describe('calendar shifts', () => {
  it('moves by days and by months, keeping the day when it exists', () => {
    expect(shiftDays('2026-11-13', -7)).toBe('2026-11-06');
    expect(shiftMonths('2026-11-13', -3)).toBe('2026-08-13');
    expect(shiftMonths('2026-11-13', -12)).toBe('2025-11-13');
    expect(shiftMonths('2026-11-13', -60)).toBe('2021-11-13');
  });

  it('clamps to the last day of a shorter month', () => {
    expect(shiftMonths('2026-05-31', -3)).toBe('2026-02-28');
    expect(shiftMonths('2024-05-31', -3)).toBe('2024-02-29');
    expect(shiftMonths('2026-03-31', -1)).toBe('2026-02-28');
  });
});

describe('valueOnOrBefore', () => {
  const series = [
    { day: '2026-11-02', v: 1 },
    { day: '2026-11-03', v: 2 },
    { day: '2026-11-06', v: 3 },
  ];

  it('finds the latest value on or before a day', () => {
    expect(valueOnOrBefore(series, '2026-11-06').v).toBe(3);
    expect(valueOnOrBefore(series, '2026-11-05').v).toBe(2);
    expect(valueOnOrBefore(series, '2030-01-01').v).toBe(3);
  });

  it('is null before the series starts', () => {
    expect(valueOnOrBefore(series, '2026-11-01')).toBeNull();
    expect(valueOnOrBefore([], '2026-11-01')).toBeNull();
  });
});

describe('periodReturns', () => {
  it('lists absolute returns up to a year and annualised ones beyond', () => {
    expect(STOCK_PERIODS.map((p) => p.id)).toEqual(['1W', '1M', '3M', '6M', '1Y']);
    expect(INDEX_PERIODS.map((p) => p.id)).toEqual(['1M', '3M', '6M', '1Y', '3Y', '5Y']);
    const get = (period) => periodReturns({ latest: 200, then: () => 100, periods: INDEX_PERIODS }).find((r) => r.period === period);
    expect(get('1M')).toMatchObject({ pct: 100, annualised: false });
    expect(get('1Y')).toMatchObject({ pct: 100, annualised: false });
    expect(get('3Y')).toMatchObject({ pct: 25.99, annualised: true });
    expect(get('5Y')).toMatchObject({ pct: 14.87, annualised: true });
  });

  it('reports null, not zero, where history is missing', () => {
    const r = periodReturns({ latest: 200, then: (p) => (p.months > 12 ? null : 100), periods: INDEX_PERIODS });
    expect(r.find((x) => x.period === '3Y').pct).toBeNull();
    expect(r.find((x) => x.period === '1M').pct).toBe(100);
  });
});

describe('risk measures on a price series', () => {
  const rising = Array.from({ length: 400 }, (_, i) => ({ day: new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10), nav: 100 + i }));

  it('finds the deepest peak-to-trough fall, as a positive percentage', () => {
    const s = [100, 120, 90, 110, 60, 130].map((nav, i) => ({ day: `2026-01-0${i + 1}`, nav }));
    expect(maxDrawdown(s)).toBe(50); // 120 -> 60
  });

  it('is zero for a series that only rises, and never negative', () => {
    expect(maxDrawdown(rising)).toBe(0);
    expect(maxDrawdown([])).toBe(0);
  });

  it('shares how often a one-year holding ended higher', () => {
    expect(positiveWindowShare(rising, 1)).toBe(100);
    const falling = rising.map((p, i) => ({ ...p, nav: 1000 - i }));
    expect(positiveWindowShare(falling, 1)).toBe(0);
  });

  it('is null when the series is shorter than the window', () => {
    expect(positiveWindowShare(rising.slice(0, 100), 1)).toBeNull();
  });
});

describe('downsample', () => {
  const s = Array.from({ length: 1000 }, (_, i) => ({ day: String(i), nav: i }));

  it('keeps at most the requested number of points, first and last included', () => {
    const out = downsample(s, 100);
    expect(out.length).toBeLessThanOrEqual(100);
    expect(out[0]).toBe(s[0]);
    expect(out.at(-1)).toBe(s.at(-1));
  });

  it('leaves a short series alone', () => {
    expect(downsample(s.slice(0, 10), 100)).toHaveLength(10);
  });
});
