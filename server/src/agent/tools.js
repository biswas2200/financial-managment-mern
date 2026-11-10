/**
 * Copilot tools. The same tools serve both engines:
 *  - Gemini receives `toolDeclarations` and decides which to call (function calling);
 *  - the offline engine calls them directly after routing the intent.
 *
 * Every tool returns { result, data?, pendingAction? }:
 *  - result: compact JSON for the model, with amounts pre-formatted in ₹
 *  - data: a payload the chat UI renders as a mini chart/table
 *  - pendingAction: a draft write that the user must confirm in the app
 */
import {
  formatMoney,
  toMinor,
  toDayKey,
  toMonthKey,
  monthRange,
  parseDateInput,
  formatMonthLabel,
  PAYMENT_METHODS,
  transactionApiSchema,
  budgetApiSchema,
} from '@kosha/shared';
import * as analytics from '../services/analytics.service.js';
import { listBudgets } from '../services/budget.service.js';
import { listTransactions } from '../services/transaction.service.js';
import { matchCategory, parseMonthPhrase } from './parser.js';

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;
const fm = (minor) => formatMoney(minor);
const pct = (v) => (v === null || v === undefined ? 'n/a' : `${v > 0 ? '+' : ''}${v}%`);

const monthParam = { type: 'string', description: 'Calendar month as YYYY-MM. Omit for the current month.' };
const dateParam = (what) => ({ type: 'string', description: `${what} date as YYYY-MM-DD` });

export const toolDeclarations = [
  {
    name: 'get_summary',
    description:
      'Income, expenses, net savings, savings rate, transaction count and change versus the previous period for a month (or a custom date range), plus the all-time balance.',
    parametersJsonSchema: {
      type: 'object',
      properties: { month: monthParam, from: dateParam('Start'), to: dateParam('End (inclusive)') },
    },
  },
  {
    name: 'get_spending_by_category',
    description: 'Spending (or income) broken down by category for a month, largest first, with each share of the total.',
    parametersJsonSchema: {
      type: 'object',
      properties: { month: monthParam, type: { type: 'string', enum: ['expense', 'income'] } },
    },
  },
  {
    name: 'compare_months',
    description: 'Compare two months: income, expenses and net, plus the categories whose spending changed the most.',
    parametersJsonSchema: {
      type: 'object',
      properties: { month_a: monthParam, month_b: monthParam },
      required: ['month_a', 'month_b'],
    },
  },
  {
    name: 'get_budget_status',
    description: 'Monthly budgets with amount spent, remaining and status (ok / warning / over).',
    parametersJsonSchema: { type: 'object', properties: { month: monthParam } },
  },
  {
    name: 'find_transactions',
    description: "Search the user's transactions by text (description or merchant), category, type and dates.",
    parametersJsonSchema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Text to look for, e.g. "swiggy" or "rent"' },
        category: { type: 'string', description: 'Category name' },
        type: { type: 'string', enum: ['expense', 'income'] },
        month: monthParam,
        from: dateParam('Start'),
        to: dateParam('End (inclusive)'),
        limit: { type: 'integer', minimum: 1, maximum: 20 },
      },
    },
  },
  {
    name: 'get_monthly_trend',
    description: 'Monthly income and expenses for the last N months, oldest first.',
    parametersJsonSchema: { type: 'object', properties: { months: { type: 'integer', minimum: 2, maximum: 12 } } },
  },
  {
    name: 'detect_unusual_spending',
    description: 'Categories where spending this month is well above the usual 3-month average.',
    parametersJsonSchema: { type: 'object', properties: { month: monthParam } },
  },
  {
    name: 'propose_transaction',
    description:
      'Draft a new income or expense entry. This does NOT save anything: the user reviews the draft and taps Confirm in the app.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['expense', 'income'] },
        amount_rupees: { type: 'number', description: 'Amount in rupees, e.g. 450 or 1299.50' },
        category: { type: 'string', description: 'One of the user’s category names' },
        description: { type: 'string', description: 'Short label, e.g. "Weekly groceries"' },
        date: dateParam('Transaction (defaults to today)'),
        merchant: { type: 'string' },
        payment_method: { type: 'string', enum: PAYMENT_METHODS },
      },
      required: ['type', 'amount_rupees', 'category', 'description'],
    },
  },
  {
    name: 'propose_budget',
    description:
      'Draft a monthly spending limit for an expense category. This does NOT save anything: the user taps Confirm in the app.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Expense category name' },
        limit_rupees: { type: 'number', description: 'Monthly limit in rupees' },
        month: monthParam,
      },
      required: ['category', 'limit_rupees'],
    },
  },
];

export function createToolExecutor({ userId, categories, now = new Date() }) {
  const resolveMonth = (value) => {
    if (!value) return undefined;
    if (MONTH_KEY.test(value)) return value;
    return parseMonthPhrase(String(value), now) ?? undefined;
  };
  const resolveDate = (value) => (value ? parseDateInput(String(value)) ?? undefined : undefined);
  const periodLabel = (period) => {
    if (period.label === 'custom') {
      return `${toDayKey(period.from)} to ${toDayKey(new Date(new Date(period.to).getTime() - 1))}`;
    }
    return `${formatMonthLabel(period.label)}${period.partial ? ' (so far)' : ''}`;
  };
  const findCategory = (name, type) => {
    if (!name) return null;
    const pool = type ? categories.filter((c) => c.type === type) : categories;
    return pool.find((c) => c.name.toLowerCase() === String(name).toLowerCase()) ?? matchCategory(String(name), pool);
  };
  const categoryNames = (type) => categories.filter((c) => c.type === type).map((c) => c.name);

  const tools = {
    async get_summary({ month, from, to }) {
      const s = await analytics.getSummary(
        userId,
        { month: resolveMonth(month), from: resolveDate(from), to: resolveDate(to) },
        now,
      );
      const label = periodLabel(s.period);
      return {
        result: {
          period: label,
          income: fm(s.income),
          expenses: fm(s.expense),
          net_savings: fm(s.net),
          savings_rate: s.savingsRate === null ? 'n/a (no income)' : `${s.savingsRate}%`,
          transactions: s.count,
          change_vs_previous_period: { income: pct(s.change.income), expenses: pct(s.change.expense) },
          all_time_balance: fm(s.balance),
        },
        data: {
          kind: 'summary',
          label,
          partial: s.period.partial,
          income: s.income,
          expense: s.expense,
          net: s.net,
          savingsRate: s.savingsRate,
          change: s.change,
          balance: s.balance,
        },
      };
    },

    async get_spending_by_category({ month, type = 'expense' }) {
      const key = resolveMonth(month) ?? toMonthKey(now);
      const r = await analytics.getByCategory(userId, { month: key, type }, now);
      const items = r.items.slice(0, 6).map(({ name, total, share, color, icon, count }) => ({ name, total, share, color, icon, count }));
      return {
        result: {
          month: formatMonthLabel(key),
          type,
          total: fm(r.total),
          categories: r.items.map((i) => ({ name: i.name, amount: fm(i.total), share: `${i.share}%`, transactions: i.count })),
        },
        data: { kind: 'categories', label: formatMonthLabel(key), type, total: r.total, items },
      };
    },

    async compare_months({ month_a, month_b }) {
      const a = resolveMonth(month_a) ?? toMonthKey(now);
      const b = resolveMonth(month_b) ?? toMonthKey(now);
      const [sa, sb, ca, cb] = await Promise.all([
        analytics.getSummary(userId, { month: a }, now),
        analytics.getSummary(userId, { month: b }, now),
        analytics.getByCategory(userId, { month: a }, now),
        analytics.getByCategory(userId, { month: b }, now),
      ]);
      const names = new Set([...ca.items, ...cb.items].map((i) => i.name));
      const changes = [...names]
        .map((name) => {
          const va = ca.items.find((i) => i.name === name)?.total ?? 0;
          const vb = cb.items.find((i) => i.name === name)?.total ?? 0;
          return { name, a: va, b: vb, delta: va - vb };
        })
        .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
        .slice(0, 5);
      const side = (key, s) => ({ label: formatMonthLabel(key), income: s.income, expense: s.expense, net: s.net });
      return {
        result: {
          [formatMonthLabel(a)]: { income: fm(sa.income), expenses: fm(sa.expense), net: fm(sa.net) },
          [formatMonthLabel(b)]: { income: fm(sb.income), expenses: fm(sb.expense), net: fm(sb.net) },
          biggest_category_changes: changes.map((c) => ({
            category: c.name,
            [formatMonthLabel(a)]: fm(c.a),
            [formatMonthLabel(b)]: fm(c.b),
            difference: formatMoney(c.delta, { signed: true }),
          })),
        },
        data: { kind: 'comparison', a: side(a, sa), b: side(b, sb), categories: changes },
      };
    },

    async get_budget_status({ month }) {
      const key = resolveMonth(month) ?? toMonthKey(now);
      const r = await listBudgets(userId, key);
      const items = r.items.map((b) => ({
        name: b.category.name,
        color: b.category.color,
        limit: b.limit,
        spent: b.spent,
        remaining: b.remaining,
        percentUsed: b.percentUsed,
        status: b.status,
      }));
      return {
        result: {
          month: formatMonthLabel(key),
          budgets: items.map((b) => ({
            category: b.name,
            limit: fm(b.limit),
            spent: fm(b.spent),
            remaining: fm(b.remaining),
            used: `${b.percentUsed}%`,
            status: b.status,
          })),
          note: items.length ? undefined : 'No budgets set for this month.',
        },
        data: { kind: 'budgets', label: formatMonthLabel(key), items, totals: r.totals },
      };
    },

    async find_transactions({ search, category, type, month, from, to, limit = 10 }) {
      const query = { page: 1, limit: Math.min(Math.max(Number(limit) || 10, 1), 20), sort: '-date' };
      if (search) query.q = String(search).slice(0, 60);
      if (type === 'income' || type === 'expense') query.type = type;
      const cat = findCategory(category, query.type);
      if (category && cat) query.category = cat.id;
      const key = resolveMonth(month);
      if (key) {
        const range = monthRange(key);
        query.from = range.start;
        query.to = new Date(range.end.getTime() - 1);
      }
      if (resolveDate(from)) query.from = resolveDate(from);
      if (resolveDate(to)) query.to = resolveDate(to);

      const r = await listTransactions(userId, query);
      const items = r.items.map((t) => ({
        id: t.id,
        date: toDayKey(t.date),
        description: t.description,
        merchant: t.merchant ?? null,
        type: t.type,
        amount: t.amount,
        category: t.category ? { name: t.category.name, color: t.category.color, icon: t.category.icon } : null,
      }));
      return {
        result: {
          matches: r.total,
          total_spent: fm(r.summary.expense),
          total_received: fm(r.summary.income),
          showing: items.map((t) => ({
            date: t.date,
            description: t.description,
            merchant: t.merchant,
            category: t.category?.name,
            amount: `${t.type === 'income' ? '+' : '-'}${fm(t.amount)}`,
          })),
        },
        data: { kind: 'transactions', total: r.total, sum: r.summary, items },
      };
    },

    async get_monthly_trend({ months = 6 }) {
      const n = Math.min(Math.max(Number(months) || 6, 2), 12);
      const items = await analytics.getTrend(userId, { months: n }, now);
      return {
        result: items.map((m) => ({ month: formatMonthLabel(m.month), income: fm(m.income), expenses: fm(m.expense), net: fm(m.net) })),
        data: { kind: 'trend', items },
      };
    },

    async detect_unusual_spending({ month }) {
      const key = resolveMonth(month) ?? toMonthKey(now);
      const items = await analytics.getUnusualSpending(userId, { month: key }, now);
      return {
        result: {
          month: formatMonthLabel(key),
          unusual: items.map((i) => ({
            category: i.name,
            this_month: fm(i.current),
            usual_monthly_average: fm(i.average),
            pace_vs_usual: i.ratio ? `${i.ratio}×` : 'n/a',
          })),
          note: items.length ? undefined : 'Nothing unusual: spending is in line with the last 3 months.',
        },
        data: { kind: 'anomalies', label: formatMonthLabel(key), items },
      };
    },

    async propose_transaction({ type = 'expense', amount_rupees, category, description, date, merchant, payment_method }) {
      const txType = type === 'income' ? 'income' : 'expense';
      let amount;
      try {
        amount = toMinor(amount_rupees);
      } catch (err) {
        return { result: { error: err.message } };
      }
      const cat = findCategory(category, txType);
      if (!cat) {
        return {
          result: {
            error: `Unknown ${txType} category "${category}".`,
            available_categories: categoryNames(txType),
          },
        };
      }
      const day = date && parseDateInput(String(date)) ? toDayKey(parseDateInput(String(date))) : toDayKey(now);
      const payload = {
        type: txType,
        amount,
        category: cat.id,
        description: String(description || cat.name).trim().slice(0, 120),
        date: day,
        paymentMethod: PAYMENT_METHODS.includes(payment_method) ? payment_method : 'UPI',
        ...(merchant ? { merchant: String(merchant).slice(0, 60) } : {}),
      };
      const check = transactionApiSchema.safeParse(payload);
      if (!check.success) return { result: { error: check.error.issues[0].message } };

      const preview = {
        type: txType,
        amount,
        description: payload.description,
        merchant: payload.merchant ?? null,
        date: day,
        paymentMethod: payload.paymentMethod,
        category: { name: cat.name, color: cat.color, icon: cat.icon },
      };
      return {
        result: {
          status: 'draft_created_awaiting_user_confirmation',
          draft: `${txType === 'income' ? 'Income' : 'Expense'} ${fm(amount)} · ${cat.name} · ${payload.description} · ${day}`,
        },
        pendingAction: { type: 'create_transaction', payload, preview },
      };
    },

    async propose_budget({ category, limit_rupees, month }) {
      let limit;
      try {
        limit = toMinor(limit_rupees);
      } catch (err) {
        return { result: { error: err.message } };
      }
      const cat = findCategory(category, 'expense');
      if (!cat) {
        return { result: { error: `Unknown expense category "${category}".`, available_categories: categoryNames('expense') } };
      }
      const key = resolveMonth(month) ?? toMonthKey(now);
      const payload = { category: cat.id, month: key, limit };
      const check = budgetApiSchema.safeParse(payload);
      if (!check.success) return { result: { error: check.error.issues[0].message } };
      return {
        result: {
          status: 'draft_created_awaiting_user_confirmation',
          draft: `Budget ${fm(limit)} for ${cat.name} in ${formatMonthLabel(key)}`,
        },
        pendingAction: {
          type: 'set_budget',
          payload,
          preview: { limit, month: key, monthLabel: formatMonthLabel(key), category: { name: cat.name, color: cat.color, icon: cat.icon } },
        },
      };
    },
  };

  return {
    async run(name, args) {
      const tool = tools[name];
      if (!tool) throw new Error(`Unknown tool "${name}"`);
      return tool(args ?? {});
    },
  };
}
