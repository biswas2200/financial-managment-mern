/**
 * Money helpers.
 *
 * Kosha never stores money as floating point. Every amount (in the database,
 * over the API and in React state) is an integer number of paise (1 ₹ = 100 paise).
 * Rupee strings are parsed digit-by-digit, so values like 0.1 + 0.2 can never drift.
 */

/** Largest single transaction we accept: ₹1,00,00,000 (one crore). */
export const MAX_AMOUNT_MINOR = 1_000_000_000;

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

export class MoneyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MoneyError';
  }
}

/**
 * Convert a rupee value ("1,234.50", "450", 99.99) into integer paise.
 * @param {string|number} input
 * @returns {number} integer paise, always > 0
 */
export function toMinor(input) {
  let raw = input;
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) throw new MoneyError('Enter a valid amount');
    raw = String(raw);
  }
  if (typeof raw !== 'string') throw new MoneyError('Amount is required');

  const cleaned = raw.trim().replace(/,/g, '');
  if (cleaned === '') throw new MoneyError('Amount is required');
  if (!AMOUNT_PATTERN.test(cleaned)) {
    throw new MoneyError('Enter a valid amount with at most 2 decimal places');
  }

  const [rupees, paise = ''] = cleaned.split('.');
  const minor = Number(rupees) * 100 + Number(paise.padEnd(2, '0'));

  if (minor === 0) throw new MoneyError('Amount must be greater than zero');
  if (!Number.isSafeInteger(minor) || minor > MAX_AMOUNT_MINOR) {
    throw new MoneyError('Amount exceeds the ₹1,00,00,000 per-transaction limit');
  }
  return minor;
}

/**
 * Integer paise → plain decimal string with exactly two places ("1234.50").
 * Used to pre-fill form inputs.
 */
export function fromMinor(minor) {
  const sign = minor < 0 ? '-' : '';
  const abs = Math.abs(minor);
  return `${sign}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

function currencySymbol(currency) {
  const parts = new Intl.NumberFormat('en-IN', { style: 'currency', currency }).formatToParts(0);
  return parts.find((p) => p.type === 'currency')?.value ?? currency;
}

function trimNumber(value) {
  return String(Number(value.toFixed(2)));
}

function compactValue(rupees) {
  const units = [
    [1e7, 'Cr'],
    [1e5, 'L'],
    [1e3, 'K'],
  ];
  for (const [size, suffix] of units) {
    if (rupees >= size) return `${trimNumber(rupees / size)}${suffix}`;
  }
  return String(Math.round(rupees));
}

/**
 * Format integer paise for display: ₹1,23,456.50 (Indian digit grouping).
 * @param {number} minor
 * @param {{currency?: string, decimals?: number, signed?: boolean, compact?: boolean}} [opts]
 */
export function formatMoney(minor, opts = {}) {
  const { currency = 'INR', decimals = 2, signed = false, compact = false } = opts;
  const value = Number(minor) || 0;
  const rupees = Math.abs(value) / 100;

  let body;
  if (compact) {
    body = `${currencySymbol(currency)}${compactValue(rupees)}`;
  } else {
    body = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(rupees);
  }

  if (value < 0) return `-${body}`;
  if (signed && value > 0) return `+${body}`;
  return body;
}

/** Exact sum of integer paise values. */
export function sumMinor(values) {
  return values.reduce((total, v) => {
    if (!Number.isInteger(v)) throw new TypeError(`Non-integer money value: ${v}`);
    return total + v;
  }, 0);
}

/**
 * Signed percentage change from `previous` to `current`, rounded to 1 decimal.
 * Returns null when there is no baseline to compare with.
 */
export function percentChange(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}
