/**
 * Date helpers. Days and months are bucketed in India Standard Time so that a
 * transaction made at 11 pm on the 31st never "moves" to the next month in reports.
 */

export const APP_TIMEZONE = 'Asia/Kolkata';
const IST_OFFSET = '+05:30';
const IST_OFFSET_MS = 330 * 60 * 1000;

const pad = (n) => String(n).padStart(2, '0');

function istParts(date) {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

/** Date → "YYYY-MM" in IST. */
export function toMonthKey(date = new Date()) {
  const { year, month } = istParts(date);
  return `${year}-${pad(month)}`;
}

/** Date → "YYYY-MM-DD" in IST. */
export function toDayKey(date = new Date()) {
  const { year, month, day } = istParts(date);
  return `${year}-${pad(month)}-${pad(day)}`;
}

export const currentMonthKey = () => toMonthKey(new Date());

/** "2026-11", -1 → "2026-10" */
export function shiftMonth(key, delta) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

/** The last `n` month keys ending at `endKey` (oldest first). */
export function lastNMonthKeys(n, endKey = currentMonthKey()) {
  return Array.from({ length: n }, (_, i) => shiftMonth(endKey, i - (n - 1)));
}

/**
 * Parse user input into a Date.
 * - "YYYY-MM-DD" becomes noon IST of that day (never shifts across midnight).
 * - Full ISO timestamps are kept as-is.
 * @returns {Date|null}
 */
export function parseDateInput(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== 'string') return null;
  const s = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    const probe = new Date(Date.UTC(y, m - 1, d));
    if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) {
      return null;
    }
    return new Date(`${s}T12:00:00${IST_OFFSET}`);
  }

  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** IST start (inclusive) and end (exclusive) instants for a "YYYY-MM" key. */
export function monthRange(key) {
  const [y, m] = key.split('-').map(Number);
  return {
    start: new Date(Date.UTC(y, m - 1, 1) - IST_OFFSET_MS),
    end: new Date(Date.UTC(y, m, 1) - IST_OFFSET_MS),
  };
}

/** "2026-10" → "October 2026" (or "Oct 26" with { short: true }). */
export function formatMonthLabel(key, { short = false } = {}) {
  const [y, m] = key.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, 15));
  if (short) {
    const month = date.toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' });
    return `${month} ${String(y).slice(2)}`;
  }
  return date.toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** IST start-of-day instant for a Date. */
export function startOfDayIST(date = new Date()) {
  const { year, month, day } = istParts(date);
  return new Date(Date.UTC(year, month - 1, day) - IST_OFFSET_MS);
}
