/**
 * Deterministic generator for Kosha's seed dataset: about a year of realistic
 * personal-finance activity for a salaried professional in Bengaluru.
 * Same seed → same data, so screenshots, tests and the committed dump stay reproducible.
 */
import { toMinor, toMonthKey, shiftMonth, lastNMonthKeys } from '@kosha/shared';

/** mulberry32: tiny, fast, seedable PRNG */
function createRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    /** Rupee amount rounded to a "real-looking" step. */
    amount: (min, max, step = 1) => Math.round((next() * (max - min) + min) / step) * step,
  };
}

const IST_MS = 330 * 60 * 1000;
const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const atIST = (y, m, d, hh, mm) => new Date(Date.UTC(y, m - 1, d, hh, mm) - IST_MS);

const MONTH_SALARY = (key) => (key >= '2026-04' ? 102000 : 92000); // appraisal in April

export function generateTransactions({ categories, now = new Date(), months = 12, seed = 2026 }) {
  const rng = createRng(seed);
  const cat = Object.fromEntries(categories.map((c) => [c.name, c]));
  const out = [];

  const currentKey = toMonthKey(now);
  const startKey = shiftMonth(currentKey, -months);

  function add(type, categoryName, rupees, y, m, d, details = {}) {
    const category = cat[categoryName];
    if (!category || d > daysIn(y, m)) return;
    const hh = details.hour ?? rng.int(8, 21);
    const mm = details.minute ?? rng.int(0, 59);
    const date = atIST(y, m, d, hh, mm);
    if (date > now) return;
    out.push({
      type,
      amount: toMinor(Number(rupees).toFixed(2)),
      category: category.id,
      description: details.description ?? categoryName,
      merchant: details.merchant,
      date,
      paymentMethod: details.paymentMethod ?? 'UPI',
      source: 'manual',
    });
  }
  const spend = (name, rupees, y, m, d, details) => add('expense', name, rupees, y, m, d, details);
  const earn = (name, rupees, y, m, d, details) => add('income', name, rupees, y, m, d, details);

  for (const key of lastNMonthKeys(months + 1, currentKey)) {
    if (key < startKey) continue;
    const [y, m] = key.split('-').map(Number);
    const dim = daysIn(y, m);
    const summer = m >= 4 && m <= 6;
    const festive = key === '2026-10' || key === '2026-11';

    // ----- Income -----
    earn('Salary', MONTH_SALARY(key), y, m, 1, { description: 'Salary: Northwind Labs', merchant: 'Northwind Labs', paymentMethod: 'Bank', hour: 9, minute: 5 });
    for (let i = 0, n = rng.int(0, 2); i < n; i += 1) {
      earn('Freelance', rng.amount(8000, 26000, 500), y, m, rng.int(3, dim), {
        description: rng.pick(['Logo design project', 'Landing page build', 'UI audit for client', 'Pitch deck design']),
        paymentMethod: 'Bank',
      });
    }
    if (m % 3 === 0) earn('Investments', rng.amount(1200, 3600, 10), y, m, rng.int(10, 20), { description: 'Mutual fund dividend', paymentMethod: 'Bank' });
    if (rng.chance(0.35)) earn('Refunds', rng.amount(400, 2600, 1), y, m, rng.int(2, dim), { description: 'Order refund', merchant: 'Amazon', paymentMethod: 'Bank' });
    if (key === '2026-11') earn('Gifts', 5000, y, m, 8, { description: 'Diwali gift from family', paymentMethod: 'UPI', hour: 11 });

    // ----- Fixed monthly costs -----
    spend('Rent & Housing', 24000, y, m, 5, { description: 'Monthly rent', paymentMethod: 'Bank', hour: 10, minute: 30 });
    if (m % 3 === 1) spend('Rent & Housing', 2400, y, m, 7, { description: 'Society maintenance', paymentMethod: 'UPI' });
    spend('Utilities', summer ? rng.amount(2100, 2900, 1) : rng.amount(1050, 1700, 1), y, m, rng.int(8, 11), { description: 'Electricity bill', merchant: 'BESCOM' });
    spend('Utilities', 999, y, m, 12, { description: 'Broadband', merchant: 'JioFiber', paymentMethod: 'Card' });
    spend('Utilities', 349, y, m, rng.int(14, 18), { description: 'Mobile recharge', merchant: 'Airtel' });
    if (m % 2 === 0) spend('Utilities', 905, y, m, rng.int(18, 24), { description: 'Gas cylinder' });
    spend('Subscriptions', 649, y, m, 15, { description: 'Netflix', merchant: 'Netflix', paymentMethod: 'Card', hour: 6 });
    spend('Subscriptions', 119, y, m, 20, { description: 'Spotify Premium', merchant: 'Spotify', paymentMethod: 'Card', hour: 6 });
    spend('Subscriptions', 75, y, m, 22, { description: 'iCloud storage', paymentMethod: 'Card', hour: 6 });
    if (m === 2) spend('Subscriptions', 1499, y, m, 9, { description: 'Prime membership (annual)', merchant: 'Amazon', paymentMethod: 'Card' });
    spend('Health', 1499, y, m, 2, { description: 'Gym membership', merchant: 'cult.fit', paymentMethod: 'Card', hour: 7 });

    // ----- Groceries: weekly stock-up + quick-commerce top-ups -----
    for (let d = rng.int(1, 4); d <= dim; d += 7) {
      spend('Groceries', rng.amount(1700, 3900, 1), y, m, d, {
        description: 'Weekly groceries',
        merchant: rng.pick(['DMart', 'BigBasket', 'BigBasket', 'More Supermarket']),
        paymentMethod: rng.pick(['UPI', 'Card']),
        hour: rng.int(10, 19),
      });
      for (let i = 0, n = rng.int(1, 3); i < n; i += 1) {
        spend('Groceries', rng.amount(180, 880, 1), y, m, Math.min(dim, d + rng.int(1, 6)), {
          description: rng.pick(['Milk & bread', 'Fruits and veggies', 'Snacks', 'Household top-up']),
          merchant: rng.pick(['Blinkit', 'Zepto', 'Swiggy Instamart']),
        });
      }
    }
    if (key === '2026-11') spend('Groceries', 2350, y, m, 7, { description: 'Diwali sweets & dry fruits', merchant: 'Anand Sweets' });

    // ----- Dining -----
    for (let i = 0, n = rng.int(9, 14); i < n; i += 1) {
      const kind = rng.next();
      if (kind < 0.55) {
        spend('Dining Out', rng.amount(240, 920, 1), y, m, rng.int(1, dim), {
          description: rng.pick(['Dinner delivery', 'Lunch order', 'Biryani night', 'Late-night pizza']),
          merchant: rng.pick(['Swiggy', 'Zomato']),
          hour: rng.int(13, 22),
        });
      } else if (kind < 0.85) {
        spend('Dining Out', rng.amount(180, 460, 10), y, m, rng.int(1, dim), {
          description: 'Coffee',
          merchant: rng.pick(['Third Wave Coffee', 'Starbucks', 'Blue Tokai']),
          hour: rng.int(9, 18),
        });
      } else {
        spend('Dining Out', rng.amount(1300, 3600, 10), y, m, rng.int(1, dim), {
          description: 'Weekend dinner with friends',
          merchant: rng.pick(['Toit', 'Truffles', 'Meghana Foods', 'The Fatty Bao']),
          paymentMethod: 'Card',
          hour: 21,
        });
      }
    }

    for (let i = 0, n = rng.int(4, 8); i < n; i += 1) {
      spend('Dining Out', rng.amount(30, 120, 10), y, m, rng.int(1, dim), { description: 'Chai & snacks', hour: rng.int(10, 18) });
    }

    // ----- Transport -----
    spend('Transport', rng.amount(500, 1000, 100), y, m, rng.int(1, 4), { description: 'Metro card recharge', merchant: 'Namma Metro' });
    spend('Transport', rng.amount(500, 1000, 100), y, m, rng.int(15, 19), { description: 'Metro card recharge', merchant: 'Namma Metro' });
    for (let i = 0, n = rng.int(6, 11); i < n; i += 1) {
      spend('Transport', rng.amount(120, 640, 1), y, m, rng.int(1, dim), {
        description: rng.pick(['Cab to office', 'Ride home', 'Airport drop', 'Auto ride']),
        merchant: rng.pick(['Uber', 'Ola', 'Rapido']),
      });
    }

    // ----- Shopping (festive spike in Oct/Nov) -----
    for (let i = 0, n = festive ? rng.int(3, 5) : rng.int(1, 3); i < n; i += 1) {
      spend('Shopping', festive ? rng.amount(1200, 5200, 1) : rng.amount(450, 3200, 1), y, m, rng.int(1, dim), {
        description: rng.pick(['Clothes', 'Shoes', 'Kitchen essentials', 'Phone accessories', 'Home decor']),
        merchant: rng.pick(['Amazon', 'Flipkart', 'Myntra', 'AJIO']),
        paymentMethod: rng.pick(['Card', 'UPI']),
      });
    }
    if (key === '2026-11') {
      spend('Shopping', 8499, y, m, 6, { description: 'Diwali outfit', merchant: 'Myntra', paymentMethod: 'Card' });
      spend('Shopping', 4290, y, m, 7, { description: 'Diyas, lights & decor', merchant: 'Amazon', paymentMethod: 'Card' });
    }

    // ----- Entertainment, health, education, personal care -----
    for (let i = 0, n = rng.int(1, 3); i < n; i += 1) {
      spend('Entertainment', rng.amount(350, 1250, 10), y, m, rng.int(1, dim), {
        description: rng.pick(['Movie tickets', 'Stand-up show', 'Bowling night']),
        merchant: rng.pick(['BookMyShow', 'PVR', 'INOX']),
      });
    }
    if (key === '2026-03') spend('Entertainment', 2999, y, m, 21, { description: 'Concert tickets', merchant: 'BookMyShow', paymentMethod: 'Card' });
    for (let i = 0, n = rng.int(1, 2); i < n; i += 1) {
      spend('Health', rng.amount(150, 920, 1), y, m, rng.int(1, dim), { description: 'Pharmacy', merchant: rng.pick(['Apollo Pharmacy', 'Tata 1mg']) });
    }
    if (rng.chance(0.25)) spend('Health', 800, y, m, rng.int(1, dim), { description: 'Doctor consultation', paymentMethod: 'UPI' });
    if (rng.chance(0.3)) spend('Education', rng.pick([449, 499, 649]), y, m, rng.int(1, dim), { description: 'Online course', merchant: 'Udemy', paymentMethod: 'Card' });
    if (rng.chance(0.3)) spend('Education', rng.amount(299, 850, 1), y, m, rng.int(1, dim), { description: 'Books', merchant: 'Amazon' });
    spend('Personal Care', rng.amount(300, 600, 50), y, m, rng.int(5, 25), { description: 'Haircut' });
    if (rng.chance(0.4)) spend('Personal Care', rng.amount(600, 1600, 1), y, m, rng.int(1, dim), { description: 'Skincare', merchant: 'Nykaa' });

    // ----- Trips -----
    if (key === '2025-12') {
      spend('Travel', 7840, y, m, 20, { description: 'Flights to Goa', merchant: 'MakeMyTrip', paymentMethod: 'Card' });
      spend('Travel', 9600, y, m, 26, { description: 'Beach stay, Goa', merchant: 'Airbnb', paymentMethod: 'Card' });
    }
    if (key === '2026-05') {
      spend('Travel', 1890, y, m, 15, { description: 'Train to Mysuru', merchant: 'IRCTC' });
      spend('Travel', 6200, y, m, 16, { description: 'Coorg homestay', paymentMethod: 'UPI' });
    }
    if (key === '2026-08') spend('Travel', 4350, y, m, 14, { description: 'Weekend in Pondicherry', paymentMethod: 'Card' });
  }

  return out.sort((a, b) => a.date - b.date);
}

const BUDGET_PLAN = {
  Groceries: 14000,
  'Dining Out': 6000,
  Transport: 4000,
  Shopping: 6000,
  Entertainment: 2500,
  Utilities: 4500,
  Subscriptions: 1200,
  Health: 3500,
  'Personal Care': 1500,
};

export function generateBudgets({ categories, now = new Date(), months = 4 }) {
  const byName = Object.fromEntries(categories.map((c) => [c.name, c]));
  return lastNMonthKeys(months, toMonthKey(now)).flatMap((month) =>
    Object.entries(BUDGET_PLAN)
      .filter(([name]) => byName[name])
      .map(([name, rupees]) => ({ category: byName[name].id, month, limit: rupees * 100 })),
  );
}
