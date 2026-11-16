/**
 * Turns a person's way of living with money (a list of rules) into a year of believable activity.
 * Same person and same date give the same data, so screenshots, tests and demos stay repeatable.
 *
 * A rule says what happens in a month:
 *   { type, category, describe, amount, ... }
 *   amount      a rupee amount, or [min, max, step] for a range
 *   steps       [[month, amount]] a new amount from that month on (a raise, a fee that goes up)
 *   times       how many in the month, a number or [min, max] (default 1)
 *   day         the day of the month, a number or [min, max] (default: any day)
 *   chance      the probability it happens at all in a month
 *   every       only every n-th month (with `offset`), for quarterly and half-yearly things
 *   monthsOfYear  only in these months of the year, e.g. [4, 7, 10, 1]
 *   onlyMonths  only in these exact months, e.g. ['2026-11']
 *   describe, merchant, method   one value or a list to pick from
 */
import { toMinor, toMonthKey, shiftMonth, lastNMonthKeys } from '@kosha/shared';
import { createRng } from './generator.js';

const IST_MS = 330 * 60 * 1000;
const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const atIST = (y, m, d, hh, mm) => new Date(Date.UTC(y, m - 1, d, hh, mm) - IST_MS);
const many = (v) => (Array.isArray(v) ? v : [v]);

/** The amount for one occurrence of a rule, in rupees. */
function amountFor(rule, key, rng) {
  let spec = rule.amount;
  for (const [from, value] of rule.steps ?? []) if (key >= from) spec = value;
  if (!Array.isArray(spec)) return spec;
  const [min, max, step = 1] = spec;
  return rng.amount(min, max, step);
}

function applies(rule, key, [y, m], rng) {
  if (rule.onlyMonths && !rule.onlyMonths.includes(key)) return false;
  if (rule.monthsOfYear && !rule.monthsOfYear.includes(m)) return false;
  if (rule.every && (y * 12 + m) % rule.every !== (rule.offset ?? 0)) return false;
  if (rule.chance !== undefined && !rng.chance(rule.chance)) return false;
  return true;
}

export function generatePersonaTransactions({ categories, now = new Date(), persona }) {
  const rng = createRng(persona.seed);
  const category = Object.fromEntries(categories.map((c) => [`${c.type}:${c.name}`, c]));
  const out = [];
  const currentKey = toMonthKey(now);
  const startKey = shiftMonth(currentKey, -persona.months);

  for (const key of lastNMonthKeys(persona.months + 1, currentKey)) {
    if (key < startKey) continue;
    const [y, m] = key.split('-').map(Number);
    const dim = daysIn(y, m);
    for (const rule of persona.rules) {
      if (!applies(rule, key, [y, m], rng)) continue;
      const found = category[`${rule.type}:${rule.category}`];
      if (!found) continue;
      const times = Array.isArray(rule.times) ? rng.int(...rule.times) : (rule.times ?? 1);
      for (let i = 0; i < times; i += 1) {
        const day = Array.isArray(rule.day) ? rng.int(...rule.day) : (rule.day ?? rng.int(1, dim));
        if (day > dim) continue;
        const hour = Array.isArray(rule.hour) ? rng.int(...rule.hour) : (rule.hour ?? rng.int(8, 21));
        const date = atIST(y, m, day, hour, rng.int(0, 59));
        if (date > now) continue;
        out.push({
          type: rule.type,
          amount: toMinor(Number(amountFor(rule, key, rng)).toFixed(2)),
          category: found.id,
          description: rng.pick(many(rule.describe)),
          merchant: rule.merchant ? rng.pick(many(rule.merchant)) : undefined,
          date,
          paymentMethod: rng.pick(many(rule.method ?? 'UPI')),
          source: 'manual',
        });
      }
    }
  }
  return out.sort((a, b) => a.date - b.date);
}

/** One monthly limit per budgeted category, for each of the last few months. */
export function generatePersonaBudgets({ categories, now = new Date(), persona, months = 4 }) {
  const byName = Object.fromEntries(categories.filter((c) => c.type === 'expense').map((c) => [c.name, c]));
  return lastNMonthKeys(months, toMonthKey(now)).flatMap((month) =>
    Object.entries(persona.budgets)
      .filter(([name]) => byName[name])
      .map(([name, rupees]) => ({ category: byName[name].id, month, limit: rupees * 100 })),
  );
}
