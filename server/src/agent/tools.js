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
import { formatPct } from '@kosha/shared';
import * as analytics from '../services/analytics.service.js';
import { listWatchlist } from '../services/watchlist.service.js';
import { ARTICLES, summarise } from '../content/articles.js';
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
    name: 'get_market_overview',
    description:
      'How the Indian stock market did on its latest trading day: Nifty 50, Nifty Bank, Nifty IT and other indices, how many stocks rose and fell, the best and worst Nifty 50 stocks and sectors. End-of-day data from the NSE, never live.',
    parametersJsonSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_stock',
    description:
      'Latest end-of-day price, move and 1 week to 1 year price returns for one NSE-listed company. Give the NSE symbol (RELIANCE, TCS) or the company name.',
    parametersJsonSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'NSE symbol or company name, e.g. "TCS" or "HDFC Bank"' } },
      required: ['query'],
    },
  },
  {
    name: 'get_index',
    description: 'Latest end-of-day level, move, P/E, P/B, dividend yield and 1 month to 5 year returns of an NSE index such as "Nifty 50" or "Nifty Bank".',
    parametersJsonSchema: { type: 'object', properties: { name: { type: 'string', description: 'Index name, e.g. "Nifty 50"' } }, required: ['name'] },
  },
  {
    name: 'get_fund',
    description:
      'A mutual fund: latest NAV, 1 month to 5 year returns, how far it has fallen at worst, and how often a year ended higher. Give the scheme code or the fund name.',
    parametersJsonSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'AMFI scheme code or fund name, e.g. "Parag Parikh Flexi Cap"' } },
      required: ['query'],
    },
  },
  {
    name: 'get_watchlist',
    description: "The stocks, indices and funds the user has saved to their watchlist, with their latest end-of-day figures.",
    parametersJsonSchema: { type: 'object', properties: {} },
  },
  {
    name: 'find_learning_articles',
    description:
      "Find Kosha's own guides in Learn that explain a topic such as an emergency fund, SIPs, inflation, mutual funds, P/E ratios, insurance, credit scores or UPI safety. Returns titles and links to open.",
    parametersJsonSchema: { type: 'object', properties: { query: { type: 'string', description: 'The topic, e.g. "emergency fund"' } }, required: ['query'] },
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

export function createToolExecutor({ userId, categories, now = new Date(), markets = null }) {
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


  // ---------- Markets and learning ----------

  const NO_MARKETS = { result: { error: 'Market data is not available here.' } };
  const unreachable = 'Market data is not reachable right now. Please try again in a few minutes.';
  /** Market failures become a plain error the model or the offline engine can repeat, never an exception. */
  const guard = async (work) => {
    if (!markets) return NO_MARKETS;
    try {
      return await work();
    } catch (err) {
      if (err?.code === 'MARKET_DATA_UNAVAILABLE') return { result: { error: unreachable } };
      if (err?.status === 404) return { result: { error: err.message } };
      throw err;
    }
  };
  const level = (n) => (typeof n === 'number' ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'n/a');
  const rupees = (n, d = 2) => (typeof n === 'number' ? `₹${n.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })}` : 'n/a');
  const pctText = (n) => (n === null || n === undefined ? 'not enough history' : formatPct(n));
  const returnsMap = (returns) =>
    Object.fromEntries(returns.map((r) => [r.label, r.annualised && r.pct !== null ? `${pctText(r.pct)} a year` : pctText(r.pct)]));
  const looksLikeSymbol = (q) => /^[A-Za-z0-9&-]{1,20}$/.test(q);
  const STOCK_NOTE = 'End-of-day closing prices. Returns are price only: not adjusted for splits, bonus issues or dividends. Not live and not advice.';

  tools.get_market_overview = () =>
    guard(async () => {
      const o = await markets.overview();
      const move = (i) => ({ name: i.name, close: level(i.close), change_pct: pctText(i.changePct), ...(i.pe != null ? { pe: i.pe } : {}) });
      const mover = (s) => ({ symbol: s.symbol, name: s.name, close: rupees(s.close), change_pct: pctText(s.changePct) });
      return {
        result: {
          as_of: o.asOf,
          note: 'End-of-day figures from the NSE, not live and not investment advice.',
          indices: o.indices.map(move),
          breadth: { advancing: o.breadth.advancers, declining: o.breadth.decliners, unchanged: o.breadth.unchanged },
          top_gainers: o.gainers.slice(0, 3).map(mover),
          top_losers: o.losers.slice(0, 3).map(mover),
          best_sectors: o.sectors.slice(0, 2).map((s) => ({ name: s.name, change_pct: pctText(s.changePct) })),
          worst_sectors: o.sectors.slice(-2).map((s) => ({ name: s.name, change_pct: pctText(s.changePct) })),
        },
        data: {
          kind: 'market',
          asOf: o.asOf,
          indices: o.indices.slice(0, 4).map((i) => ({ name: i.name, close: i.close, changePct: i.changePct })),
          breadth: o.breadth,
          gainers: o.gainers.slice(0, 3).map((s) => ({ symbol: s.symbol, changePct: s.changePct })),
          losers: o.losers.slice(0, 3).map((s) => ({ symbol: s.symbol, changePct: s.changePct })),
        },
      };
    });

  tools.get_stock = ({ query }) =>
    guard(async () => {
      const q = String(query ?? '').trim();
      if (!q) return { result: { error: 'Tell me which company, by name or NSE symbol.' } };
      let detail = null;
      if (looksLikeSymbol(q)) {
        try {
          detail = await markets.stockDetail(q);
        } catch (err) {
          if (err?.status !== 404) throw err;
        }
      }
      let others = [];
      if (!detail) {
        const found = await markets.searchStocks(q);
        if (!found.length) return { result: { error: `I could not find a stock matching "${q}" on the NSE.` } };
        detail = await markets.stockDetail(found[0].symbol);
        others = found.slice(1, 4).map((f) => `${f.symbol}: ${f.name}`);
      }
      return {
        result: {
          symbol: detail.symbol,
          ...(others.length ? { other_matches: others } : {}),
          name: detail.name,
          industry: detail.industry,
          as_of: detail.asOf,
          close: rupees(detail.close),
          change_pct: pctText(detail.changePct),
          day_range: `${rupees(detail.low)} to ${rupees(detail.high)}`,
          returns: returnsMap(detail.returns),
          note: STOCK_NOTE,
        },
        data: {
          kind: 'quote', type: 'stock', symbol: detail.symbol, name: detail.name, price: detail.close, changePct: detail.changePct, asOf: detail.asOf,
          returns: detail.returns.map(({ period, label, pct }) => ({ period, label, pct })),
        },
      };
    });

  tools.get_index = ({ name }) =>
    guard(async () => {
      const i = await markets.indexDetail(String(name ?? '').trim());
      return {
        result: {
          name: i.name,
          as_of: i.asOf,
          level: level(i.close),
          change_pct: pctText(i.changePct),
          pe: i.pe,
          pb: i.pb,
          dividend_yield: i.dividendYield === null ? null : `${i.dividendYield}%`,
          returns: returnsMap(i.returns),
          note: 'End-of-day index levels. Returns are price returns and leave out dividends. Not live and not advice.',
        },
        data: {
          kind: 'quote', type: 'index', name: i.name, price: i.close, changePct: i.changePct, asOf: i.asOf,
          returns: i.returns.map(({ period, label, pct }) => ({ period, label, pct })),
        },
      };
    });

  tools.get_fund = ({ query }) =>
    guard(async () => {
      const q = String(query ?? '').trim();
      if (!q) return { result: { error: 'Tell me which fund, by name or scheme code.' } };
      let detail = null;
      if (/^\d+$/.test(q)) {
        try {
          detail = await markets.fundDetail(Number(q));
        } catch (err) {
          if (err?.status !== 404) throw err;
        }
      }
      let others = [];
      let exact = true;
      if (!detail) {
        const found = await markets.searchFunds(q);
        if (!found.length) return { result: { error: `I could not find a mutual fund matching "${q}".` } };
        detail = await markets.fundDetail(found[0].code);
        exact = found[0].name.toLowerCase().replace(/\s+/g, ' ').includes(q.toLowerCase().replace(/\s+/g, ' '));
        others = found.slice(1, 4).map((f) => f.name);
      }
      return {
        result: {
          matched_exactly: exact,
          ...(others.length ? { other_matches: others } : {}),
          name: detail.name,
          fund_house: detail.house,
          category: detail.category,
          nav: rupees(detail.nav, 4),
          nav_date: detail.navDate,
          returns: returnsMap(detail.returns),
          worst_fall: `${detail.risk.maxDrawdownPct}% from a peak`,
          ...(detail.risk.positiveYearShare !== null ? { years_ended_higher: `${detail.risk.positiveYearShare}% of one-year periods since launch` } : {}),
          note: 'NAV data from AMFI. Past performance does not predict future returns. Returns above one year are yearly rates. Not advice.',
        },
        data: {
          kind: 'quote', type: 'fund', name: detail.name, price: detail.nav, changePct: null, asOf: detail.navDate,
          returns: detail.returns.map(({ period, label, pct }) => ({ period, label, pct })),
        },
      };
    });

  tools.get_watchlist = () =>
    guard(async () => {
      const { items } = await listWatchlist(userId, markets);
      return {
        result: {
          count: items.length,
          items: items.map((i) => ({
            type: i.kind,
            name: i.label,
            latest: i.price === null ? 'figures unavailable' : i.kind === 'fund' ? rupees(i.price, 4) : i.kind === 'index' ? level(i.price) : rupees(i.price),
            change_pct: pctText(i.changePct),
            as_of: i.asOf,
          })),
          note: items.length ? 'End-of-day figures. Not live and not advice.' : 'The watchlist is empty.',
        },
      };
    });

  const STOP = new Set(['what', 'is', 'an', 'a', 'the', 'explain', 'me', 'to', 'how', 'do', 'does', 'i', 'my', 'about', 'of', 'and', 'in', 'for', 'tell', 'start', 'begin', 'meaning']);
  const stem = (w) => w.replace(/(ing|ed|es|s)$/i, '');
  tools.find_learning_articles = async ({ query }) => {
    const words = String(query ?? '')
      .toLowerCase()
      .split(/[^a-z0-9/]+/)
      .filter((w) => w.length > 1 && !STOP.has(w))
      .map(stem);
    const score = (a) => {
      const title = a.title.toLowerCase();
      const summary = a.summary.toLowerCase();
      const rest = `${a.takeaways.join(' ')} ${a.slug}`.toLowerCase();
      return words.reduce((n, w) => n + (title.includes(w) ? 3 : 0) + (summary.includes(w) ? 2 : 0) + (rest.includes(w) ? 1 : 0), 0);
    };
    const top = ARTICLES.map((a) => ({ a, s: score(a) }))
      .filter((x) => x.s > 0)
      .sort((x, y) => y.s - x.s)
      .slice(0, 3)
      .map((x) => summarise(x.a));
    return {
      result: {
        articles: top.map((a) => ({ title: a.title, slug: a.slug, link: `/learn/${a.slug}`, summary: a.summary, read_minutes: a.readMinutes })),
        note: top.length ? undefined : 'No guide matches that topic yet.',
      },
      ...(top.length ? { data: { kind: 'articles', items: top.map(({ slug, title, summary, domain, readMinutes }) => ({ slug, title, summary, domain, readMinutes })) } } : {}),
    };
  };

  return {
    async run(name, args) {
      const tool = tools[name];
      if (!tool) throw new Error(`Unknown tool "${name}"`);
      return tool(args ?? {});
    },
  };
}
