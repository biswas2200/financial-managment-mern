/** Shared rules for Markets: what can be watched, and how a move is shown. */
import { z } from 'zod';

export const WATCH_KINDS = ['stock', 'index', 'fund'];
export const MAX_WATCHLIST = 50;

export const watchSchema = z.object({
  kind: z.enum(WATCH_KINDS, { errorMap: () => ({ message: 'You can watch a stock, an index or a fund' }) }),
  ref: z.string({ required_error: 'Choose something to watch' }).trim().min(1, 'Choose something to watch').max(80, 'That name is too long'),
});

/** "+1.23%" / "-0.61%" / "0.00%" for a move, or an en dash when there is no figure. */
export function formatPct(value, { signed = true } = {}) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '–';
  const n = Number(value);
  const text = `${Math.abs(n).toFixed(2)}%`;
  if (n > 0) return signed ? `+${text}` : text;
  if (n < 0) return `-${text}`;
  return text;
}

/** up / down / flat, for colour and arrows. */
export const trend = (value) => (!Number.isFinite(Number(value)) || Number(value) === 0 ? 'flat' : Number(value) > 0 ? 'up' : 'down');
