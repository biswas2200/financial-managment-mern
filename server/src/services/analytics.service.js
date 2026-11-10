/**
 * Analytics: every number on the dashboard is computed inside MongoDB with
 * aggregation pipelines ($match → $group → $lookup / $facet), bucketed in IST.
 */
import {
  APP_TIMEZONE,
  monthRange,
  shiftMonth,
  toMonthKey,
  startOfDayIST,
  lastNMonthKeys,
  percentChange,
} from '@kosha/shared';
import { Transaction } from '../models/Transaction.js';
import { toObjectId } from '../utils/ids.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Resolve the reporting window from the query.
 * - `from`/`to`: custom inclusive day range; previous = window of equal length just before.
 * - `month` (default: current): whole month; if it's still in progress, compare
 *   month-to-date with the same elapsed time of the previous month.
 */
export function resolvePeriod({ month, from, to } = {}, now = new Date()) {
  if (from || to) {
    const start = from ? startOfDayIST(from) : new Date(0);
    const end = to ? new Date(startOfDayIST(to).getTime() + DAY_MS) : now;
    const length = end.getTime() - start.getTime();
    return {
      label: 'custom',
      start,
      end,
      prevStart: new Date(start.getTime() - length),
      prevEnd: start,
      partial: false,
    };
  }

  const key = month ?? toMonthKey(now);
  const { start, end } = monthRange(key);
  const prev = monthRange(shiftMonth(key, -1));

  if (now >= start && now < end) {
    const elapsed = now.getTime() - start.getTime();
    const prevEnd = new Date(Math.min(prev.start.getTime() + elapsed, prev.end.getTime()));
    return { label: key, start, end: now, prevStart: prev.start, prevEnd, partial: true };
  }
  return { label: key, start, end, prevStart: prev.start, prevEnd: prev.end, partial: false };
}

const byType = (groups) => {
  const income = groups.find((g) => g._id === 'income');
  const expense = groups.find((g) => g._id === 'expense');
  const inc = income?.total ?? 0;
  const exp = expense?.total ?? 0;
  return { income: inc, expense: exp, net: inc - exp, count: (income?.count ?? 0) + (expense?.count ?? 0) };
};

const groupByType = [{ $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }];

/** Income, expense, net, savings rate and change vs. the previous period, plus all-time balance. */
export async function getSummary(userId, query = {}, now = new Date()) {
  const period = resolvePeriod(query, now);
  const [facets] = await Transaction.aggregate([
    { $match: { user: toObjectId(userId) } },
    {
      $facet: {
        current: [{ $match: { date: { $gte: period.start, $lt: period.end } } }, ...groupByType],
        previous: [{ $match: { date: { $gte: period.prevStart, $lt: period.prevEnd } } }, ...groupByType],
        allTime: groupByType,
      },
    },
  ]);

  const current = byType(facets.current);
  const previous = byType(facets.previous);
  const allTime = byType(facets.allTime);
  const days = Math.max(1, Math.ceil((period.end.getTime() - period.start.getTime()) / DAY_MS));

  return {
    period: {
      label: period.label,
      from: period.start,
      to: period.end,
      partial: period.partial,
    },
    ...current,
    savingsRate: current.income ? Math.round((current.net / current.income) * 1000) / 10 : null,
    avgDailyExpense: Math.round(current.expense / days),
    previous: { from: period.prevStart, to: period.prevEnd, ...previous },
    change: {
      income: percentChange(current.income, previous.income),
      expense: percentChange(current.expense, previous.expense),
      net: percentChange(current.net, previous.net),
    },
    balance: allTime.net,
  };
}

/** Spending (or income) per category with share of total, largest first. */
export async function getByCategory(userId, query = {}, now = new Date()) {
  const { start, end } = resolvePeriod(query, now);
  const type = query.type ?? 'expense';

  const rows = await Transaction.aggregate([
    { $match: { user: toObjectId(userId), type, date: { $gte: start, $lt: end } } },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
    { $unwind: '$category' },
    { $sort: { total: -1, 'category.name': 1 } },
    {
      $project: {
        _id: 0,
        categoryId: { $toString: '$_id' },
        name: '$category.name',
        icon: '$category.icon',
        color: '$category.color',
        total: 1,
        count: 1,
      },
    },
  ]);

  const total = rows.reduce((sum, r) => sum + r.total, 0);
  return {
    type,
    total,
    items: rows.map((r) => ({ ...r, share: total ? Math.round((r.total / total) * 1000) / 10 : 0 })),
  };
}

/** Monthly income vs expense for the last `months` months (zero-filled). */
export async function getTrend(userId, { months = 6, end } = {}, now = new Date()) {
  const keys = lastNMonthKeys(months, end ?? toMonthKey(now));
  const rows = await Transaction.aggregate([
    {
      $match: {
        user: toObjectId(userId),
        date: { $gte: monthRange(keys[0]).start, $lt: monthRange(keys.at(-1)).end },
      },
    },
    {
      $group: {
        _id: {
          month: { $dateToString: { format: '%Y-%m', date: '$date', timezone: APP_TIMEZONE } },
          type: '$type',
        },
        total: { $sum: '$amount' },
      },
    },
  ]);

  return keys.map((month) => {
    const income = rows.find((r) => r._id.month === month && r._id.type === 'income')?.total ?? 0;
    const expense = rows.find((r) => r._id.month === month && r._id.type === 'expense')?.total ?? 0;
    return { month, income, expense, net: income - expense };
  });
}

/** One row per calendar day of the month: feeds the spending heatmap. */
export async function getDaily(userId, { month } = {}, now = new Date()) {
  const key = month ?? toMonthKey(now);
  const { start, end } = monthRange(key);
  const rows = await Transaction.aggregate([
    { $match: { user: toObjectId(userId), date: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: APP_TIMEZONE } },
        income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
        expense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
        count: { $sum: 1 },
      },
    },
  ]);
  const byDay = new Map(rows.map((r) => [r._id, r]));

  const daysInMonth = Math.round((end.getTime() - start.getTime()) / DAY_MS);
  return Array.from({ length: daysInMonth }, (_, i) => {
    const date = `${key}-${String(i + 1).padStart(2, '0')}`;
    const r = byDay.get(date);
    return { date, income: r?.income ?? 0, expense: r?.expense ?? 0, count: r?.count ?? 0 };
  });
}

/** Expense totals by day of week, Monday first. */
export async function getWeekday(userId, query = {}, now = new Date()) {
  const { start, end } = resolvePeriod(query, now);
  const rows = await Transaction.aggregate([
    { $match: { user: toObjectId(userId), type: 'expense', date: { $gte: start, $lt: end } } },
    {
      $group: {
        // $dayOfWeek: 1 = Sunday … 7 = Saturday
        _id: { $dayOfWeek: { date: '$date', timezone: APP_TIMEZONE } },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);
  return WEEKDAYS.map((day, i) => {
    const mongoDay = ((i + 1) % 7) + 1; // Mon→2 … Sat→7, Sun→1
    const r = rows.find((row) => row._id === mongoDay);
    return { day, total: r?.total ?? 0, count: r?.count ?? 0 };
  });
}

/** Where the money goes: top merchants by spend. */
export async function getMerchants(userId, query = {}, now = new Date()) {
  const { start, end } = resolvePeriod(query, now);
  return Transaction.aggregate([
    {
      $match: {
        user: toObjectId(userId),
        type: 'expense',
        date: { $gte: start, $lt: end },
        merchant: { $exists: true, $nin: [null, ''] },
      },
    },
    { $group: { _id: '$merchant', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1, _id: 1 } },
    { $limit: query.limit ?? 5 },
    { $project: { _id: 0, merchant: '$_id', total: 1, count: 1 } },
  ]);
}

/**
 * Categories whose spending this month is well above their 3-month average.
 * Mid-month, flag a category only once it has already passed its usual full-month
 * level, or (after 40% of the month) is running 1.5× the pro-rated pace.
 */
export async function getUnusualSpending(userId, { month } = {}, now = new Date()) {
  const key = month ?? toMonthKey(now);
  const { series } = await getCategoryTrend(userId, { months: 4, end: key, top: 100 }, now);
  const { start, end } = monthRange(key);
  const inProgress = now > start && now < end;
  const fraction = inProgress ? (now.getTime() - start.getTime()) / (end.getTime() - start.getTime()) : 1;
  const MIN_GAP = 100000; // ₹1,000

  return series
    .map((s) => {
      const current = s.values.at(-1);
      const history = s.values.slice(0, -1);
      const average = Math.round(history.reduce((a, b) => a + b, 0) / history.length);
      const expected = Math.round(average * fraction);
      return {
        categoryId: s.categoryId,
        name: s.name,
        color: s.color,
        current,
        average,
        expected,
        ratio: average ? Math.round((current / Math.max(expected, 1)) * 10) / 10 : null,
      };
    })
    .filter((r) => {
      if (!r.average) return false;
      const beyondUsualMonth = r.current > r.average * 1.25 && r.current - r.average >= MIN_GAP;
      const fastPace = fraction >= 0.4 && r.current > r.expected * 1.5 && r.current - r.expected >= MIN_GAP;
      return beyondUsualMonth || fastPace;
    })
    .sort((a, b) => b.ratio - a.ratio);
}

/** Monthly spend for the top-N categories over the window; everything else folds into "Other". */
export async function getCategoryTrend(userId, { months = 6, end, top = 4 } = {}, now = new Date()) {
  const keys = lastNMonthKeys(months, end ?? toMonthKey(now));
  const match = {
    user: toObjectId(userId),
    type: 'expense',
    date: { $gte: monthRange(keys[0]).start, $lt: monthRange(keys.at(-1)).end },
  };

  const rows = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          category: '$category',
          month: { $dateToString: { format: '%Y-%m', date: '$date', timezone: APP_TIMEZONE } },
        },
        total: { $sum: '$amount' },
      },
    },
    { $lookup: { from: 'categories', localField: '_id.category', foreignField: '_id', as: 'category' } },
    { $unwind: '$category' },
    {
      $project: {
        _id: 0,
        categoryId: { $toString: '$_id.category' },
        month: '$_id.month',
        name: '$category.name',
        color: '$category.color',
        total: 1,
      },
    },
  ]);

  const totals = new Map();
  for (const r of rows) {
    const t = totals.get(r.categoryId) ?? { categoryId: r.categoryId, name: r.name, color: r.color, total: 0 };
    t.total += r.total;
    totals.set(r.categoryId, t);
  }
  const ranked = [...totals.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  const leaders = ranked.slice(0, top);
  const leaderIds = new Set(leaders.map((l) => l.categoryId));

  const valuesFor = (predicate) =>
    keys.map((m) => rows.filter((r) => r.month === m && predicate(r)).reduce((s, r) => s + r.total, 0));

  const series = leaders.map((l) => ({
    categoryId: l.categoryId,
    name: l.name,
    color: l.color,
    values: valuesFor((r) => r.categoryId === l.categoryId),
  }));
  if (ranked.length > top) {
    series.push({ categoryId: 'other', name: 'Other', color: null, values: valuesFor((r) => !leaderIds.has(r.categoryId)) });
  }
  return { months: keys, series };
}
