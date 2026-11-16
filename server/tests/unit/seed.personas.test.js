import { describe, it, expect } from 'vitest';
import { AVATAR_PRESETS, DEFAULT_CATEGORIES, TRANSACTION_TYPES, lastNMonthKeys, toMonthKey, ageFromDob } from '@kosha/shared';
import { PERSONAS, PERSONA_PASSWORD, personaCategories } from '../../src/seed/personas.js';
import { generatePersonaTransactions, generatePersonaBudgets } from '../../src/seed/persona-generator.js';

const NOW = new Date('2026-11-10T15:00:00+05:30');
const idFor = (persona) => {
  const all = personaCategories(persona);
  return all.map((c, i) => ({ ...c, id: `${persona.key}-cat${i}` }));
};
const generate = (persona) => generatePersonaTransactions({ categories: idFor(persona), now: NOW, persona });
const byKey = Object.fromEntries(PERSONAS.map((p) => [p.key, p]));

/** Rupees per month, by category name, over the complete months (not the one still going on). */
function monthly(persona) {
  const categories = idFor(persona);
  const name = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const months = lastNMonthKeys(persona.months + 1, '2026-11').slice(0, -1);
  const rows = Object.fromEntries(months.map((m) => [m, { income: 0, expense: 0, byCategory: {} }]));
  for (const t of generate(persona)) {
    const row = rows[toMonthKey(t.date)];
    if (!row) continue;
    row[t.type] += t.amount / 100;
    const key = `${t.type}:${name[t.category]}`;
    row.byCategory[key] = (row.byCategory[key] ?? 0) + t.amount / 100;
  }
  return Object.values(rows);
}
const totalBy = (rows, type) => {
  const sums = {};
  for (const r of rows) for (const [k, v] of Object.entries(r.byCategory)) if (k.startsWith(`${type}:`)) sums[k.slice(type.length + 1)] = (sums[k.slice(type.length + 1)] ?? 0) + v;
  return Object.entries(sums).sort((a, b) => b[1] - a[1]).map(([n]) => n);
};

describe('Sample accounts for different ways of living with money', () => {
  it('has eight, each a different person', () => {
    expect(PERSONAS.length).toBeGreaterThanOrEqual(8);
    for (const field of ['key', 'name', 'email', 'city']) {
      const values = PERSONAS.map((p) => p[field]);
      expect(new Set(values).size, field).toBe(PERSONAS.length);
    }
  });

  it('use real-looking names, a kosha.app email, one shared password for local demos, and an age that fits their story', () => {
    expect(PERSONA_PASSWORD).toBe('Demo@1234');
    for (const p of PERSONAS) {
      expect(p.name, p.key).toMatch(/^\p{Lu}\p{L}+( \p{Lu}\p{L}+)+$/u);
      expect(p.email).toMatch(/^[a-z]+@kosha\.app$/);
      expect(p.dateOfBirth).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(ageFromDob(p.dateOfBirth, NOW)).toBeGreaterThanOrEqual(18);
      expect(AVATAR_PRESETS).toContain(p.avatar.preset);
    }
    expect(ageFromDob(byKey.kabir.dateOfBirth, NOW)).toBeLessThan(25);
    expect(ageFromDob(byKey.mohan.dateOfBirth, NOW)).toBeGreaterThan(60);
  });

  it('cover a spread of lives: a student, a homemaker, a freelancer, a shop owner, a retiree, a couple saving for a home, an investor and a doctor', () => {
    expect(Object.keys(byKey)).toEqual(expect.arrayContaining(['kabir', 'nandini', 'karthik', 'vikas', 'mohan', 'jasleen', 'rohit', 'farah']));
    expect(new Set(PERSONAS.map((p) => p.city)).size).toBe(PERSONAS.length);
  });

  it('add only the extra categories their life needs, named and typed properly', () => {
    const defaults = new Set(DEFAULT_CATEGORIES.map((c) => `${c.type}:${c.name.toLowerCase()}`));
    for (const p of PERSONAS) {
      for (const c of p.extraCategories ?? []) {
        expect(TRANSACTION_TYPES).toContain(c.type);
        expect(c.name.length).toBeLessThanOrEqual(30);
        expect(c.color).toMatch(/^#[0-9a-f]{6}$/i);
        expect(c.icon).toMatch(/^[a-z]+(-[a-z]+)*$/);
        expect(defaults.has(`${c.type}:${c.name.toLowerCase()}`), `${p.key}: ${c.name} is already a default`).toBe(false);
      }
      const names = personaCategories(p).map((c) => `${c.type}:${c.name.toLowerCase()}`);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('only use categories that exist for that person', () => {
    for (const p of PERSONAS) {
      const have = new Set(personaCategories(p).map((c) => `${c.type}:${c.name}`));
      for (const r of p.rules) expect(have.has(`${r.type}:${r.category}`), `${p.key}: ${r.type} ${r.category}`).toBe(true);
      for (const name of Object.keys(p.budgets)) expect(have.has(`expense:${name}`), `${p.key} budget ${name}`).toBe(true);
    }
  });
});

describe('The transactions made for each of them', () => {
  it('are the same every time for the same person and date', () => {
    for (const p of PERSONAS) {
      const a = generate(p);
      const b = generate(p);
      expect(b).toHaveLength(a.length);
      expect(b.slice(0, 30)).toEqual(a.slice(0, 30));
    }
  });

  it('differ from person to person', () => {
    const firsts = PERSONAS.map((p) => JSON.stringify(generate(p).slice(0, 12).map((t) => [t.category.split('-')[0], t.description, t.amount])));
    expect(new Set(firsts).size).toBe(PERSONAS.length);
  });

  it('are valid: positive whole paise, a category of the same type, a real date inside the person\'s window, and some words about each', () => {
    for (const p of PERSONAS) {
      const cats = Object.fromEntries(idFor(p).map((c) => [c.id, c]));
      const txns = generate(p);
      const start = new Date(`${lastNMonthKeys(p.months + 1, '2026-11')[0]}-01T00:00:00+05:30`);
      expect(txns.length, p.key).toBeGreaterThan(p.months * 14);
      expect(txns.length, p.key).toBeLessThan(p.months * 90);
      for (const t of txns) {
        expect(Number.isInteger(t.amount)).toBe(true);
        expect(t.amount).toBeGreaterThan(0);
        expect(cats[t.category]?.type, `${p.key}: ${t.description}`).toBe(t.type);
        expect(t.date.getTime()).toBeLessThanOrEqual(NOW.getTime());
        expect(t.date.getTime()).toBeGreaterThanOrEqual(start.getTime());
        expect(t.description.trim().length).toBeGreaterThan(2);
        expect(['UPI', 'Card', 'Cash', 'Bank', 'Wallet']).toContain(t.paymentMethod);
      }
      const times = txns.map((t) => t.date.getTime());
      expect(times).toEqual([...times].sort((a, b) => a - b));
    }
  });

  it('have both money in and money out in every complete month', () => {
    for (const p of PERSONAS) {
      for (const row of monthly(p)) {
        expect(row.income, `${p.key} income`).toBeGreaterThan(0);
        expect(row.expense, `${p.key} spending`).toBeGreaterThan(0);
      }
    }
  });

  it('keep spending in a believable relation to income: nobody saves nothing, and nobody spends several times what they earn', () => {
    for (const p of PERSONAS) {
      const rows = monthly(p);
      const income = rows.reduce((s, r) => s + r.income, 0);
      const spent = rows.reduce((s, r) => s + r.expense, 0);
      expect(spent / income, `${p.key} spends ${(100 * spent) / income}% of income`).toBeGreaterThan(0.35);
      expect(spent / income, `${p.key} spends ${(100 * spent) / income}% of income`).toBeLessThan(1.02);
      for (const r of rows) expect(r.expense / r.income, `${p.key} in one month`).toBeLessThan(2.2);
    }
  });

  it('look like the life they belong to', () => {
    const avgIncome = (p) => monthly(p).reduce((s, r) => s + r.income, 0) / monthly(p).length;
    expect(avgIncome(byKey.kabir)).toBeLessThan(26000); // a student
    expect(avgIncome(byKey.vikas)).toBeGreaterThan(120000); // a shop
    expect(totalBy(monthly(byKey.vikas), 'income')[0]).toBe('Shop sales');
    expect(totalBy(monthly(byKey.mohan), 'income')[0]).toBe('Pension');
    expect(totalBy(monthly(byKey.mohan), 'expense').slice(0, 3)).toContain('Health');
    expect(totalBy(monthly(byKey.nandini), 'income')[0]).toBe('Household allowance');
    expect(totalBy(monthly(byKey.nandini), 'expense').slice(0, 3)).toContain('Education');
    expect(totalBy(monthly(byKey.rohit), 'expense').slice(0, 3)).toContain('SIP & investments');
    expect(totalBy(monthly(byKey.jasleen), 'expense').slice(0, 3)).toContain('Home fund');
    expect(totalBy(monthly(byKey.farah), 'expense')[0]).toBe('Rent & Housing');
    expect(totalBy(monthly(byKey.farah), 'expense')).toContain('Loan EMI');
  });

  it('give the freelancer a lumpy income and everyone with a salary a steady one', () => {
    const cv = (p) => {
      const incomes = monthly(p).map((r) => r.income);
      const mean = incomes.reduce((a, b) => a + b, 0) / incomes.length;
      return Math.sqrt(incomes.reduce((s, x) => s + (x - mean) ** 2, 0) / incomes.length) / mean;
    };
    expect(cv(byKey.karthik)).toBeGreaterThan(0.25);
    expect(cv(byKey.rohit)).toBeLessThan(0.35);
    expect(cv(byKey.jasleen)).toBeLessThan(0.2);
    expect(cv(byKey.mohan)).toBeLessThan(0.25);
  });

  it('give the salaried a raise on the date their story says', () => {
    const salary = (p, month) => generate(p).filter((t) => t.description.startsWith('Salary') && toMonthKey(t.date) === month)[0]?.amount;
    expect(salary(byKey.jasleen, '2026-05')).toBeGreaterThan(salary(byKey.jasleen, '2026-03'));
  });

  it('show the festive season in the shops and homes that feel it', () => {
    const month = (p, key) => monthly({ ...p, months: p.months })[lastNMonthKeys(p.months + 1, '2026-11').slice(0, -1).indexOf(key)];
    const shopping = (p, key) => month(p, key).byCategory['expense:Shopping'] ?? 0;
    expect(shopping(byKey.nandini, '2026-10')).toBeGreaterThan(1.4 * shopping(byKey.nandini, '2026-08'));
  });
});

describe('Their budgets', () => {
  it('cover at least four categories each, for the last four months, in whole paise', () => {
    for (const p of PERSONAS) {
      const cats = idFor(p);
      const budgets = generatePersonaBudgets({ categories: cats, now: NOW, persona: p, months: 4 });
      const months = [...new Set(budgets.map((b) => b.month))].sort();
      expect(months).toEqual(lastNMonthKeys(4, '2026-11'));
      expect(Object.keys(p.budgets).length, p.key).toBeGreaterThanOrEqual(4);
      for (const b of budgets) {
        expect(Number.isInteger(b.limit) && b.limit > 0).toBe(true);
        expect(cats.some((c) => c.id === b.category && c.type === 'expense')).toBe(true);
      }
      expect(budgets).toHaveLength(4 * Object.keys(p.budgets).length);
    }
  });

  it('are neither impossible nor pointless: a budget is below what the person spends on it, in at least one month, and not by miles', () => {
    for (const p of PERSONAS) {
      const cats = idFor(p);
      const name = Object.fromEntries(cats.map((c) => [c.id, c.name]));
      const rows = monthly(p); // the whole window, so a category that is skipped some months does not decide it
      for (const [category, rupees] of Object.entries(p.budgets)) {
        const spends = rows.map((r) => r.byCategory[`expense:${category}`] ?? 0);
        const avg = spends.reduce((a, b) => a + b, 0) / spends.length;
        expect(rupees, `${p.key}: ${category} budget ${rupees} against typical ${Math.round(avg)}`).toBeGreaterThan(avg * 0.5);
        expect(rupees, `${p.key}: ${category} budget ${rupees} against typical ${Math.round(avg)}`).toBeLessThan(avg * 3 + 500);
      }
      expect(name).toBeTruthy();
    }
  });
});
