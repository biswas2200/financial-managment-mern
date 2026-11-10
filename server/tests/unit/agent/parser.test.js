import { describe, it, expect } from 'vitest';
import {
  parseAmount,
  parseDatePhrase,
  parseMonthPhrase,
  matchCategory,
  detectType,
  detectMerchant,
} from '../../../src/agent/parser.js';

const NOW = new Date('2026-11-10T15:00:00+05:30');

const CATEGORIES = [
  { id: 'g', name: 'Groceries', type: 'expense' },
  { id: 'd', name: 'Dining Out', type: 'expense' },
  { id: 't', name: 'Transport', type: 'expense' },
  { id: 's', name: 'Subscriptions', type: 'expense' },
  { id: 'r', name: 'Rent & Housing', type: 'expense' },
  { id: 'p', name: 'Pets', type: 'expense' },
  { id: 'sal', name: 'Salary', type: 'income' },
  { id: 'f', name: 'Freelance', type: 'income' },
];

describe('parseAmount', () => {
  it.each([
    ['spent 450 on groceries', 45000],
    ['₹1,250.50 dinner with friends', 125050],
    ['paid Rs. 300 for an auto', 30000],
    ['300 rs metro card', 30000],
    ['2.5k on shoes', 250000],
    ['got a 1.5 lakh bonus', 15000000],
    ['INR 99 for netflix', 9900],
    ['spent 300 on 5 nov', 30000],
    ['bought groceries for 1200 3 days ago', 120000],
  ])('%s → %i paise', (text, expected) => {
    expect(parseAmount(text)).toBe(expected);
  });

  it('returns null when there is no amount', () => {
    expect(parseAmount('add an expense for groceries')).toBeNull();
  });
});

describe('parseDatePhrase', () => {
  it.each([
    ['today', '2026-11-10'],
    ['spent 200 yesterday', '2026-11-09'],
    ['day before yesterday', '2026-11-08'],
    ['3 days ago', '2026-11-07'],
    ['on 2026-11-05', '2026-11-05'],
    ['on 5 nov', '2026-11-05'],
    ['november 3rd', '2026-11-03'],
    ['on 28 dec', '2025-12-28'], // a future day this year means last year
  ])('%s → %s', (text, expected) => {
    expect(parseDatePhrase(text, NOW)).toBe(expected);
  });

  it('returns null when no date is mentioned', () => {
    expect(parseDatePhrase('lunch at the office', NOW)).toBeNull();
  });
});

describe('parseMonthPhrase', () => {
  it.each([
    ['how much did I spend this month', '2026-11'],
    ['summary for last month', '2026-10'],
    ['previous month breakdown', '2026-10'],
    ['what about october', '2026-10'],
    ['spending in dec', '2025-12'],
    ['march 2026 summary', '2026-03'],
    ['in may', '2026-05'],
  ])('%s → %s', (text, expected) => {
    expect(parseMonthPhrase(text, NOW)).toBe(expected);
  });

  it('does not mistake the verb "may" for a month', () => {
    expect(parseMonthPhrase('may I see my balance', NOW)).toBeNull();
  });
});

describe('matchCategory', () => {
  it.each([
    ['450 for groceries', 'Groceries'],
    ['zomato order 380', 'Dining Out'],
    ['uber to the airport', 'Transport'],
    ['netflix renewal', 'Subscriptions'],
    ['paid the rent', 'Rent & Housing'],
    ['vet bill for pets', 'Pets'],
    ['received my salary', 'Salary'],
  ])('%s → %s', (text, expected) => {
    expect(matchCategory(text, CATEGORIES)?.name).toBe(expected);
  });

  it('respects the transaction type when given', () => {
    expect(matchCategory('freelance client paid', CATEGORIES, 'income')?.name).toBe('Freelance');
    expect(matchCategory('salary', CATEGORIES, 'expense')).toBeNull();
  });

  it('returns null when nothing matches', () => {
    expect(matchCategory('something random', CATEGORIES)).toBeNull();
  });
});

describe('detectType & detectMerchant', () => {
  it('spots income words', () => {
    expect(detectType('received 85000 salary')).toBe('income');
    expect(detectType('got paid 12k for the logo project')).toBe('income');
    expect(detectType('spent 300 on uber')).toBe('expense');
  });

  it('extracts well-known merchants', () => {
    expect(detectMerchant('zomato order 380')).toBe('Zomato');
    expect(detectMerchant('spent 300 at dmart')).toBe('DMart');
    expect(detectMerchant('lunch')).toBeNull();
  });
});
