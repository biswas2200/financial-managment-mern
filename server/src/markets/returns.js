/** Return arithmetic on dated series. Series are arrays sorted oldest first, each item with a `day` ("YYYY-MM-DD"). */

const round2 = (n) => {
  const r = Math.round(n * 100) / 100;
  return r === 0 ? 0 : r; // never "-0"
};
const ok = (n) => typeof n === 'number' && Number.isFinite(n);

export const pctChange = (now, then) => (ok(now) && ok(then) && then !== 0 ? round2((now / then - 1) * 100) : null);

/** Compound annual growth rate over a number of years. */
export const cagr = (now, then, years) => (ok(now) && ok(then) && then > 0 && now > 0 && years > 0 ? round2(((now / then) ** (1 / years) - 1) * 100) : null);

const utc = (day) => {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const key = (ms) => new Date(ms).toISOString().slice(0, 10);

export const shiftDays = (day, n) => key(utc(day) + n * 86_400_000);

/** Calendar months, keeping the day of the month or clamping to the last day of a shorter one. */
export function shiftMonths(day, n) {
  const [y, m, d] = day.split('-').map(Number);
  const target = m - 1 + n;
  const year = y + Math.floor(target / 12);
  const month = ((target % 12) + 12) % 12;
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return key(Date.UTC(year, month, Math.min(d, last)));
}

/** The latest item on or before `day`, or null if the series starts after it. */
export function valueOnOrBefore(series, day) {
  let lo = 0;
  let hi = series.length - 1;
  let found = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (series[mid].day <= day) {
      found = series[mid];
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
}

export const STOCK_PERIODS = [
  { id: '1W', label: '1 week', days: 7 },
  { id: '1M', label: '1 month', months: 1 },
  { id: '3M', label: '3 months', months: 3 },
  { id: '6M', label: '6 months', months: 6 },
  { id: '1Y', label: '1 year', months: 12 },
];

export const INDEX_PERIODS = [
  { id: '1M', label: '1 month', months: 1 },
  { id: '3M', label: '3 months', months: 3 },
  { id: '6M', label: '6 months', months: 6 },
  { id: '1Y', label: '1 year', months: 12 },
  { id: '3Y', label: '3 years', months: 36 },
  { id: '5Y', label: '5 years', months: 60 },
];

export const FUND_TOP_PERIODS = INDEX_PERIODS.filter((p) => ['1Y', '3Y', '5Y'].includes(p.id));

/** The day a period reaches back to from `latestDay`. */
export const targetDay = (latestDay, period) => (period.days ? shiftDays(latestDay, -period.days) : shiftMonths(latestDay, -period.months));

/**
 * Returns for each period. Up to a year it is the plain change; beyond a year it is annualised (CAGR),
 * which is how Indian funds and indices quote long returns. `then(period)` gives the starting value, or
 * { value, from } where `from` is the trading day actually used, or null when history does not reach back.
 */
export function periodReturns({ latest, then, periods }) {
  return periods.map((period) => {
    const base = then(period);
    const value = base && typeof base === 'object' ? base.value : base;
    const from = base && typeof base === 'object' ? base.from : null;
    const annualised = (period.months ?? 0) > 12;
    const pct = ok(value) ? (annualised ? cagr(latest, value, period.months / 12) : pctChange(latest, value)) : null;
    return { period: period.id, label: period.label, pct, annualised, from: pct === null ? null : from };
  });
}

/** Deepest fall from a previous high, as a positive percentage. */
export function maxDrawdown(series) {
  let peak = -Infinity;
  let worst = 0;
  for (const { nav } of series) {
    if (nav > peak) peak = nav;
    else if (peak > 0) worst = Math.max(worst, (peak - nav) / peak);
  }
  return round2(worst * 100);
}

/** Share (0–100) of days on which holding for `years` would have ended higher; null if history is too short. */
export function positiveWindowShare(series, years = 1) {
  let total = 0;
  let positive = 0;
  let j = 0;
  for (const point of series) {
    const target = shiftMonths(point.day, -12 * years);
    if (series[0].day > target) continue;
    while (j + 1 < series.length && series[j + 1].day <= target) j += 1;
    total += 1;
    if (point.nav > series[j].nav) positive += 1;
  }
  return total ? Math.round((positive / total) * 1000) / 10 : null;
}

/** At most `max` evenly spaced points, always keeping the first and the last. */
export function downsample(series, max) {
  if (series.length <= max) return series;
  const out = [];
  const step = (series.length - 1) / (max - 1);
  let last = -1;
  for (let k = 0; k < max; k += 1) {
    const i = Math.round(k * step);
    if (i !== last) out.push(series[i]);
    last = i;
  }
  return out;
}
