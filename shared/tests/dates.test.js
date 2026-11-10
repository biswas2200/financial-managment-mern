import { describe, it, expect } from 'vitest';
import { toMonthKey, parseDateInput, monthRange, APP_TIMEZONE } from '../src/dates.js';

describe('dates', () => {
  it('uses India Standard Time for day/month bucketing', () => {
    expect(APP_TIMEZONE).toBe('Asia/Kolkata');
  });

  it('builds YYYY-MM month keys in IST, not UTC', () => {
    // 2026-10-31 20:00 UTC is already 1 Nov in India
    expect(toMonthKey(new Date('2026-10-31T20:00:00Z'))).toBe('2026-11');
    expect(toMonthKey(new Date('2026-03-15T06:00:00Z'))).toBe('2026-03');
  });

  it('parses a date-only string as noon IST so it never shifts day', () => {
    const d = parseDateInput('2026-11-09');
    expect(d.toISOString()).toBe('2026-11-09T06:30:00.000Z');
  });

  it('passes full ISO timestamps through unchanged', () => {
    expect(parseDateInput('2026-11-09T10:15:00.000Z').toISOString()).toBe('2026-11-09T10:15:00.000Z');
  });

  it('returns null for garbage', () => {
    expect(parseDateInput('not-a-date')).toBeNull();
    expect(parseDateInput('2026-13-40')).toBeNull();
  });

  it('gives the IST start/end instants of a month', () => {
    const { start, end } = monthRange('2026-02');
    expect(start.toISOString()).toBe('2026-01-31T18:30:00.000Z');
    expect(end.toISOString()).toBe('2026-02-28T18:30:00.000Z');
  });
});
