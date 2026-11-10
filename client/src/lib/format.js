import { formatMoney, formatMonthLabel, APP_TIMEZONE } from '@kosha/shared';

export { formatMonthLabel };

export const money = (minor, opts) => formatMoney(minor, opts);
export const moneyWhole = (minor, opts = {}) => formatMoney(minor, { decimals: 0, ...opts });
export const moneyCompact = (minor) => formatMoney(minor, { compact: true });

const dateFmt = (options) => new Intl.DateTimeFormat('en-IN', { timeZone: APP_TIMEZONE, ...options });
const SHORT = dateFmt({ day: 'numeric', month: 'short' });
const LONG = dateFmt({ day: 'numeric', month: 'short', year: 'numeric' });
const DAY_HEADER = dateFmt({ weekday: 'long', day: 'numeric', month: 'short' });
const TIME = dateFmt({ hour: 'numeric', minute: '2-digit' });

/** Accepts Date, ISO string, or "YYYY-MM-DD" (treated as an IST calendar day). */
function toDate(value) {
  if (value instanceof Date) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T12:00:00+05:30`);
  return new Date(value);
}

export const dateShort = (v) => SHORT.format(toDate(v));
export const dateLong = (v) => LONG.format(toDate(v));
export const dayHeader = (v) => DAY_HEADER.format(toDate(v));
export const timeOfDay = (v) => TIME.format(toDate(v));

export function percent(value, { signed = false } = {}) {
  if (value === null || value === undefined) return 'n/a';
  const abs = Math.abs(value).toLocaleString('en-IN', { maximumFractionDigits: 1 });
  if (!signed) return `${value < 0 ? '-' : ''}${abs}%`;
  return `${value > 0 ? '+' : value < 0 ? '-' : ''}${abs}%`;
}

export function greeting(now = new Date()) {
  const hour = Number(dateFmt({ hour: 'numeric', hourCycle: 'h23' }).format(now));
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
