/**
 * Profile rules shared by the API and the React forms: contact details, age,
 * avatar choices and the version of the policy text a user agreed to.
 */
import { toDayKey } from './dates.js';

/** Bump this date whenever the Terms or the Privacy Policy change in a way users must re-accept. */
export const POLICY_VERSION = '2026-11-16';

/** Youngest age we accept at sign-up. */
export const MIN_AGE = 13;

/** Icons offered as a profile picture. Keys map to lucide icons in the client. */
export const AVATAR_PRESETS = [
  'cat', 'dog', 'rocket', 'leaf', 'coffee', 'star', 'heart', 'smile',
  'ghost', 'bird', 'fish', 'flower', 'sun', 'moon', 'gem', 'crown',
];

/** Backgrounds for a preset avatar. */
export const AVATAR_COLORS = ['#2c3a8f', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#6250d6', '#2a78d6', '#e34948'];

/** Uploaded photos are resized in the browser to roughly 256 px; this is the hard cap on the data URL. */
export const MAX_AVATAR_CHARS = 90_000;

/**
 * Turn what people type into E.164 ("+919876543210"), or null when it cannot be a real number.
 * Indian mobiles (10 digits starting 6–9, with or without +91 / 0) are the default; any other
 * country needs its "+" prefix.
 */
export function normalizePhone(input) {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  const international = trimmed.startsWith('+') || trimmed.startsWith('(+');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  if (international) {
    if (digits.startsWith('91')) return /^91[6-9]\d{9}$/.test(digits) ? `+${digits}` : null;
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  const national = digits.replace(/^0+/, '').replace(/^91(?=\d{10}$)/, '');
  return /^[6-9]\d{9}$/.test(national) ? `+91${national}` : null;
}

/** Whole years between a "YYYY-MM-DD" birth date and today (IST). */
export function ageFromDob(dob, now = new Date()) {
  const [by, bm, bd] = dob.split('-').map(Number);
  const [ty, tm, td] = toDayKey(now).split('-').map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age;
}
