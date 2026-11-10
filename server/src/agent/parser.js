/**
 * Natural-language helpers for the Copilot: pull amounts, dates, months,
 * categories and merchants out of short phrases like
 * "spent ₹450 on groceries yesterday" or "budget 12k for dining in march".
 */
import { toMinor, toDayKey, toMonthKey, shiftMonth, parseDateInput } from '@kosha/shared';

const MONTH_NAMES = [
  ['jan', 'january'],
  ['feb', 'february'],
  ['mar', 'march'],
  ['apr', 'april'],
  ['may'],
  ['jun', 'june'],
  ['jul', 'july'],
  ['aug', 'august'],
  ['sep', 'sept', 'september'],
  ['oct', 'october'],
  ['nov', 'november'],
  ['dec', 'december'],
];
const MONTH_ALT = MONTH_NAMES.flat().sort((a, b) => b.length - a.length).join('|');
const MONTH_RE = new RegExp(`\\b(${MONTH_ALT})\\b`, 'i');

function monthIndex(word) {
  const w = word.toLowerCase();
  return MONTH_NAMES.findIndex((names) => names.includes(w));
}

const pad = (n) => String(n).padStart(2, '0');

// ---------- Amounts ----------

const MULTIPLIERS = { k: 1e3, thousand: 1e3, l: 1e5, lac: 1e5, lakh: 1e5, lakhs: 1e5 };
const SUFFIX = '(k|thousand|lakhs?|lac|l)?';

function toPaise(numberText, suffix) {
  const n = Number(numberText) * (MULTIPLIERS[suffix?.toLowerCase()] ?? 1);
  if (!Number.isFinite(n) || n <= 0) return null;
  try {
    return toMinor((Math.round(n * 100) / 100).toFixed(2));
  } catch {
    return null;
  }
}

/** First money amount mentioned, in paise, or null. Dates and durations are ignored. */
export function parseAmount(text) {
  const t = text.toLowerCase().replace(/(\d),(?=\d{2,3}\b)/g, '$1');

  const marked =
    new RegExp(`(?:₹|\\brs\\.?|\\binr)\\s*(\\d+(?:\\.\\d+)?)\\s*${SUFFIX}\\b`).exec(t) ??
    new RegExp(`\\b(\\d+(?:\\.\\d+)?)\\s*${SUFFIX}\\s*(?:rs\\b|rupees\\b|inr\\b|₹)`).exec(t);
  if (marked) return toPaise(marked[1], marked[2]);

  const withSuffix = /\b(\d+(?:\.\d+)?)\s*(k|thousand|lakhs?|lac)\b/.exec(t) ?? /\b(\d+(?:\.\d+)?)(l)\b/.exec(t);
  if (withSuffix) return toPaise(withSuffix[1], withSuffix[2]);

  const numberRe = /\d+(?:\.\d+)?/g;
  let match;
  while ((match = numberRe.exec(t))) {
    const before = t.slice(0, match.index);
    const after = t.slice(match.index + match[0].length);
    const isDatePart =
      /^-\d/.test(after) ||
      /\d-$/.test(before) ||
      /^\s*(st|nd|rd|th)\b/.test(after) ||
      new RegExp(`^\\s*(of\\s+)?(${MONTH_ALT})\\b`).test(after) ||
      new RegExp(`\\b(${MONTH_ALT})\\s*$`).test(before) ||
      /^\s*(days?|weeks?|months?|years?|hrs?|hours?|mins?|minutes?)\b/.test(after) ||
      /[a-z]$/.test(before); // part of a word like "mp3"
    if (!isDatePart) return toPaise(match[0]);
  }
  return null;
}

// ---------- Dates & months ----------

function istToday(now) {
  const [y, m, d] = toDayKey(now).split('-').map(Number);
  return { y, m, d };
}

function dayKeyFromUTC(ms) {
  const dt = new Date(ms);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** A specific day mentioned in the text, as "YYYY-MM-DD" (IST), or null. */
export function parseDatePhrase(text, now = new Date()) {
  const t = text.toLowerCase();
  const { y, m, d } = istToday(now);
  const todayMs = Date.UTC(y, m - 1, d);
  const daysAgo = (n) => dayKeyFromUTC(todayMs - n * 86400000);

  if (/\bday before yesterday\b/.test(t)) return daysAgo(2);
  if (/\byesterday\b/.test(t)) return daysAgo(1);
  if (/\b(today|tonight|this morning|this evening)\b/.test(t)) return daysAgo(0);
  const ago = /\b(\d{1,2})\s+days?\s+ago\b/.exec(t);
  if (ago) return daysAgo(Number(ago[1]));

  const iso = /\b(\d{4}-\d{2}-\d{2})\b/.exec(t);
  if (iso && parseDateInput(iso[1])) return iso[1];

  const dayFirst = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTH_ALT})\\b`).exec(t);
  const monthFirst = new RegExp(`\\b(${MONTH_ALT})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`).exec(t);
  const hit = dayFirst
    ? { day: Number(dayFirst[1]), month: monthIndex(dayFirst[2]) }
    : monthFirst
      ? { day: Number(monthFirst[2]), month: monthIndex(monthFirst[1]) }
      : null;
  if (hit && hit.month >= 0 && hit.day >= 1 && hit.day <= 31) {
    let year = y;
    if (Date.UTC(year, hit.month, hit.day) > todayMs) year -= 1;
    const key = `${year}-${pad(hit.month + 1)}-${pad(hit.day)}`;
    return parseDateInput(key) ? key : null;
  }
  return null;
}

/** A calendar month mentioned in the text, as "YYYY-MM", or null. */
export function parseMonthPhrase(text, now = new Date()) {
  const t = text.toLowerCase();
  const current = toMonthKey(now);
  if (/\b(this|current)\s+month\b/.test(t)) return current;
  if (/\b(last|previous|prev|past)\s+month\b/.test(t)) return shiftMonth(current, -1);

  const re = new RegExp(`\\b(${MONTH_ALT})\\b(?:\\s+(\\d{4}))?`, 'g');
  let match;
  while ((match = re.exec(t))) {
    const word = match[1];
    // "may" is usually a verb; only accept "in may", "for may", "may 2026"…
    if (word === 'may' && !match[2] && !/\b(in|for|during|of|since)\s+may\b/.test(t)) continue;
    const idx = monthIndex(word);
    const [cy, cm] = current.split('-').map(Number);
    let year = match[2] ? Number(match[2]) : cy;
    if (!match[2] && idx + 1 > cm) year -= 1;
    return `${year}-${pad(idx + 1)}`;
  }
  return null;
}

/** All months mentioned, in order (used for "compare october and september"). */
export function parseMonthPhrases(text, now = new Date()) {
  const found = [];
  const t = text.toLowerCase();
  const current = toMonthKey(now);
  if (/\b(this|current)\s+month\b/.test(t)) found.push(current);
  if (/\b(last|previous|prev)\s+month\b/.test(t)) found.push(shiftMonth(current, -1));
  for (const part of t.split(/\b(?:and|vs\.?|versus|with|to|against)\b|,/)) {
    if (/\b(this|current|last|previous|prev)\s+month\b/.test(part)) continue;
    const key = MONTH_RE.test(part) ? parseMonthPhrase(part, now) : null;
    if (key && !found.includes(key)) found.push(key);
  }
  return found;
}

// ---------- Categories, merchants, type ----------

const SYNONYMS = {
  Groceries: ['grocery', 'groceries', 'vegetables', 'veggies', 'fruits', 'milk', 'kirana', 'supermarket', 'bigbasket', 'blinkit', 'zepto', 'dmart', 'instamart'],
  'Dining Out': ['dining', 'restaurant', 'dinner', 'lunch', 'breakfast', 'swiggy', 'zomato', 'cafe', 'coffee', 'food', 'pizza', 'biryani', 'eat out', 'eating out', 'takeaway', 'starbucks'],
  Transport: ['transport', 'uber', 'ola', 'rapido', 'cab', 'taxi', 'auto', 'metro', 'bus', 'train ticket', 'fuel', 'petrol', 'diesel', 'parking', 'toll', 'commute'],
  'Rent & Housing': ['rent', 'housing', 'maintenance', 'landlord', 'society'],
  Utilities: ['electricity', 'power bill', 'water bill', 'gas', 'cylinder', 'wifi', 'internet', 'broadband', 'jiofiber', 'airtel', 'recharge', 'mobile bill', 'phone bill', 'utility', 'utilities', 'bescom'],
  Shopping: ['shopping', 'amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'clothes', 'shoes', 'shirt', 'gadget'],
  Entertainment: ['movie', 'movies', 'cinema', 'pvr', 'inox', 'bookmyshow', 'concert', 'gaming', 'games', 'entertainment', 'outing'],
  Health: ['medicine', 'medicines', 'pharmacy', 'doctor', 'hospital', 'apollo', 'clinic', 'health', 'gym', 'medical', 'tablets', '1mg', 'cult'],
  Subscriptions: ['netflix', 'spotify', 'prime', 'hotstar', 'youtube premium', 'subscription', 'icloud', 'chatgpt', 'membership'],
  Education: ['course', 'books', 'book', 'udemy', 'coursera', 'tuition', 'fees', 'exam', 'education', 'stationery'],
  Travel: ['flight', 'hotel', 'trip', 'travel', 'irctc', 'makemytrip', 'goibibo', 'vacation', 'holiday', 'airbnb'],
  'Personal Care': ['salon', 'haircut', 'spa', 'grooming', 'cosmetics', 'skincare', 'nykaa', 'personal care'],
  Salary: ['salary', 'paycheck', 'payroll', 'stipend', 'wages'],
  Freelance: ['freelance', 'client', 'gig', 'consulting', 'side project', 'logo project'],
  Investments: ['dividend', 'interest', 'investment', 'mutual fund', 'stocks', 'returns', 'fd'],
  Gifts: ['gift', 'gifted', 'shagun'],
  Refunds: ['refund', 'refunded', 'cashback', 'reimbursement'],
};

const wordRe = (phrase) => new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');

/**
 * Best category for the text among the user's categories (default or custom).
 * Exact category names win; then the synonym list.
 */
export function matchCategory(text, categories, type) {
  const pool = type ? categories.filter((c) => c.type === type) : categories;
  const byLength = [...pool].sort((a, b) => b.name.length - a.name.length);

  for (const c of byLength) {
    const singular = c.name.replace(/s$/i, '');
    if (wordRe(c.name).test(text) || (singular.length > 2 && wordRe(singular).test(text))) return c;
  }
  for (const [name, words] of Object.entries(SYNONYMS)) {
    const category = pool.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (category && words.some((w) => wordRe(w).test(text))) return category;
  }
  return null;
}

const MERCHANTS = {
  swiggy: 'Swiggy', zomato: 'Zomato', uber: 'Uber', ola: 'Ola', rapido: 'Rapido', amazon: 'Amazon',
  flipkart: 'Flipkart', myntra: 'Myntra', ajio: 'AJIO', dmart: 'DMart', bigbasket: 'BigBasket',
  blinkit: 'Blinkit', zepto: 'Zepto', instamart: 'Instamart', netflix: 'Netflix', spotify: 'Spotify',
  hotstar: 'Hotstar', bookmyshow: 'BookMyShow', pvr: 'PVR', inox: 'INOX', irctc: 'IRCTC',
  makemytrip: 'MakeMyTrip', apollo: 'Apollo Pharmacy', starbucks: 'Starbucks', airtel: 'Airtel',
  jiofiber: 'JioFiber', bescom: 'BESCOM', nykaa: 'Nykaa', udemy: 'Udemy', '1mg': 'Tata 1mg',
};

export function detectMerchant(text) {
  for (const [key, name] of Object.entries(MERCHANTS)) {
    if (wordRe(key).test(text)) return name;
  }
  return null;
}

const INCOME_WORDS =
  /\b(received|receive|got paid|earned|earn|salary|credited|income|refund(ed)?|cashback|dividend|bonus|stipend|freelance|reimbursed)\b/i;

export function detectType(text) {
  return INCOME_WORDS.test(text) ? 'income' : 'expense';
}
