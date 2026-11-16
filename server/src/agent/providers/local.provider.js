/**
 * Offline engine for Kosha Copilot: used when no Gemini API key is configured
 * or Gemini is unreachable. It routes the message with deterministic rules, calls
 * the same tools Gemini would, and writes the reply from response templates.
 */
import { formatMoney, fromMinor, toDayKey, toMonthKey, shiftMonth, formatMonthLabel } from '@kosha/shared';
import { classifyIntent } from '../intents.js';
import {
  parseAmount,
  parseDatePhrase,
  parseMonthPhrase,
  parseMonthPhrases,
  matchCategory,
  detectMerchant,
  detectType,
} from '../parser.js';

const fm = (m) => formatMoney(m);

/** "2026-11-13" → "13 Nov 2026". */
const dayLong = (key) => new Date(`${key}T12:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

const FILLER = new Set([
  'tell', 'me', 'about', 'what', 'whats', "what's", 'is', 'are', 'the', 'a', 'an', 'price', 'of', 'how', 'doing', 'did', 'do', 'stock', 'stocks', 'share', 'shares',
  'today', 'now', 'current', 'latest', 'please', 'show', 'give', 'mutual', 'fund', 'funds', 'nav', 'on', 'it', 'my', 'its', 'for',
]);
/** What is left of a question once the filler words are gone: a company or fund name. */
const subjectOf = (text) =>
  text
    .toLowerCase()
    .replace(/[?!.,]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !FILLER.has(w))
    .join(' ');

const MARKET_DOWN = "I can't reach the market data right now, so I won't guess. Please try again in a few minutes.";

/** "2026-11-09" → "today", "yesterday" or "9 Nov". */
function friendlyDay(dayKey, now) {
  if (dayKey === toDayKey(now)) return 'today';
  if (dayKey === toDayKey(new Date(now.getTime() - 86400000))) return 'yesterday';
  return new Date(`${dayKey}T12:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
}

/** Stable pick so the same question gets the same wording. */
function pick(options, seed) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return options[h % options.length];
}

const SUGGESTIONS = [
  'How much did I spend this month?',
  'Where is my money going?',
  'Am I over budget?',
  'Spent 450 on groceries yesterday',
];

const TIPS = [
  'Move a fixed amount to savings on salary day, before you start spending. Even 10% adds up quickly.',
  'Set a monthly budget for your top two categories; that is where small cuts make the biggest difference.',
  'Review subscriptions every quarter and cancel the ones you have not used in the last month.',
  'Batch grocery shopping once a week with a list. It cuts impulse buys and quick-commerce delivery fees.',
  'Keep an emergency fund of 3 to 6 months of expenses in a separate account before investing for higher returns.',
];

export function createLocalProvider() {
  async function respond({ text, user, categories, executor, now = new Date() }) {
    const intent = classifyIntent(text);
    const firstName = (user?.name ?? '').split(' ')[0] || 'there';
    const toolCalls = [];
    const call = async (name, args) => {
      toolCalls.push(name);
      return executor.run(name, args);
    };
    const done = (reply, extra = {}) => ({ provider: 'offline', intent, reply, toolCalls, ...extra });
    const month = parseMonthPhrase(text, now) ?? undefined;

    switch (intent) {
      case 'greeting':
        return done(
          pick(
            [
              `Hi ${firstName}! I can break down your spending, check your budgets, spot unusual expenses, or log a transaction for you. Try "${SUGGESTIONS[0]}"`,
              `Hello ${firstName}! Ask me about your balance, your top categories, or say something like "${SUGGESTIONS[3]}" and I'll draft it for you.`,
            ],
            text,
          ),
        );

      case 'thanks':
        return done(pick(['Anytime! Let me know if you want to check anything else.', 'Happy to help. Ask me whenever you need a quick check-in on your money.'], text));

      case 'help':
        return done(
          "Here's what I can do: summarise any month (\"How did I do in October?\"), show where your money goes, compare months, check budgets, flag unusual spending, find transactions (\"show my Swiggy orders\"), and draft new entries or budgets for you to confirm (\"spent 300 on Uber\", \"set a budget of 5000 for dining\").",
        );

      case 'summary': {
        const r = await call('get_summary', { month });
        const d = r.data;
        let reply = /\bbalance\b/i.test(text) ? `Your current balance is **${fm(d.balance)}**. ` : '';
        reply += `${d.label}: you earned ${fm(d.income)} and spent **${fm(d.expense)}**`;
        reply += d.net >= 0 ? `, so you saved ${fm(d.net)}` : `, so you spent ${fm(-d.net)} more than you earned`;
        if (d.savingsRate !== null && d.net >= 0) reply += ` (${d.savingsRate}% of your income)`;
        reply += '.';
        if (d.change.expense !== null) {
          const when = d.partial ? 'the same point last month' : 'the previous month';
          reply += ` Spending is ${d.change.expense >= 0 ? 'up' : 'down'} ${Math.abs(d.change.expense)}% compared with ${when}.`;
        }
        return done(reply, { data: d });
      }

      case 'categories':
      case 'top_expense': {
        const r = await call('get_spending_by_category', { month });
        const d = r.data;
        if (!d.items.length) return done(`I don't see any spending in ${d.label} yet.`, { data: d });
        if (intent === 'top_expense') {
          const top = d.items[0];
          return done(
            `Your biggest expense category in ${d.label} is **${top.name}** at ${fm(top.total)}, ${top.share}% of everything you spent across ${top.count} transaction${top.count === 1 ? '' : 's'}.`,
            { data: d },
          );
        }
        const list = d.items
          .slice(0, 3)
          .map((i) => `${i.name} ${fm(i.total)} (${i.share}%)`)
          .join(', ');
        return done(`In ${d.label} you spent ${fm(d.total)}. The biggest slices: ${list}.`, { data: d });
      }

      case 'compare': {
        const found = parseMonthPhrases(text, now);
        const current = toMonthKey(now);
        const [a, b] = found.length >= 2 ? found : [found[0] ?? current, shiftMonth(found[0] ?? current, -1)];
        const r = await call('compare_months', { month_a: a, month_b: b });
        const { a: A, b: B, categories: changes } = r.data;
        const diff = A.expense - B.expense;
        let reply = `${A.label}: spent ${fm(A.expense)} vs ${fm(B.expense)} in ${B.label}, ${diff >= 0 ? 'up' : 'down'} ${fm(Math.abs(diff))}.`;
        const mover = changes.find((c) => c.delta !== 0);
        if (mover) {
          reply += ` The biggest change was ${mover.name} (${formatMoney(mover.delta, { signed: true })}).`;
        }
        return done(reply, { data: r.data });
      }

      case 'budget_status': {
        const r = await call('get_budget_status', { month });
        const d = r.data;
        if (!d.items.length) {
          return done(`You haven't set any budgets for ${d.label}. Try "set a budget of 5000 for dining" and I'll draft one.`, { data: d });
        }
        const over = d.items.filter((b) => b.status === 'over');
        const close = d.items.filter((b) => b.status === 'warning');
        let reply = `You've used ${fm(d.totals.spent)} of ${fm(d.totals.limit)} budgeted for ${d.label}.`;
        if (over.length) reply += ` Over budget: ${over.map((b) => `${b.name} (${b.percentUsed}%)`).join(', ')}.`;
        if (close.length) reply += ` Getting close: ${close.map((b) => `${b.name} (${b.percentUsed}%)`).join(', ')}.`;
        if (!over.length && !close.length) reply += ' Every category is comfortably within its limit.';
        return done(reply, { data: d });
      }

      case 'unusual': {
        const r = await call('detect_unusual_spending', { month });
        const d = r.data;
        if (!d.items.length) {
          return done(`Nothing unusual in ${d.label}. Every category is in line with your last three months.`, { data: d });
        }
        const list = d.items
          .slice(0, 3)
          .map((i) => `${i.name} (${fm(i.current)} vs a usual ${fm(i.average)})`)
          .join(', ');
        return done(`A few categories are running higher than usual in ${d.label}: ${list}.`, { data: d });
      }

      case 'find_transactions': {
        const merchant = detectMerchant(text);
        const category = merchant ? null : matchCategory(text, categories);
        const type = /\bincome|received|credits?\b/i.test(text) ? 'income' : undefined;
        const r = await call('find_transactions', {
          search: merchant ?? undefined,
          category: category?.name,
          type,
          month,
          limit: 10,
        });
        const d = r.data;
        const what = merchant ?? category?.name ?? 'matching';
        if (!d.total) return done(`I couldn't find any ${what} transactions${month ? ` in ${formatMonthLabel(month)}` : ''}.`, { data: d });
        const total = type === 'income' ? d.sum.income : d.sum.expense;
        return done(
          `Found ${d.total} ${what} transaction${d.total === 1 ? '' : 's'}${month ? ` in ${formatMonthLabel(month)}` : ''}, totalling ${fm(total)}. ${d.total > d.items.length ? `Here are the latest ${d.items.length}.` : ''}`.trim(),
          { data: d },
        );
      }

      case 'trend': {
        const n = Number(/(\d+)\s*months?/i.exec(text)?.[1] ?? 6);
        const r = await call('get_monthly_trend', { months: n });
        const items = r.data.items;
        const avg = Math.round(items.reduce((s, m) => s + m.expense, 0) / items.length);
        const peak = items.reduce((a, b) => (b.expense > a.expense ? b : a), items[0]);
        return done(
          `Over the last ${items.length} months you spent an average of ${fm(avg)} a month. The highest was ${formatMonthLabel(peak.month)} at ${fm(peak.expense)}.`,
          { data: r.data },
        );
      }

      case 'tips': {
        const r = await call('get_spending_by_category', {});
        const top = r.data.items[0];
        const personal = top
          ? `Your largest category this month is ${top.name} (${top.share}% of spending), so that's the best place to look first. `
          : '';
        return done(`${personal}${pick(TIPS, text)} (General guidance, not professional financial advice.)`, { data: r.data });
      }

      case 'add_transaction': {
        const type = detectType(text);
        const amount = parseAmount(text);
        if (!amount) {
          return done('How much was it? For example: "add 450 for groceries yesterday".');
        }
        const category = matchCategory(text, categories, type);
        if (!category) {
          const options = categories
            .filter((c) => c.type === type)
            .slice(0, 5)
            .map((c) => c.name)
            .join(', ');
          return done(`Which category should ${fm(amount)} go under? For example: ${options}.`);
        }
        const merchant = detectMerchant(text);
        const date = parseDatePhrase(text, now) ?? toDayKey(now);
        const r = await call('propose_transaction', {
          type,
          amount_rupees: fromMinor(amount),
          category: category.name,
          description: merchant ?? category.name,
          date,
          merchant: merchant ?? undefined,
        });
        if (!r.pendingAction) return done(`I couldn't draft that: ${r.result.error}`);
        return done(
          `Here's the draft: ${type === 'income' ? 'income' : 'an expense'} of **${fm(amount)}** in ${category.name}${merchant ? ` at ${merchant}` : ''}, dated ${friendlyDay(date, now)}. Tap Confirm to save it.`,
          { pendingAction: r.pendingAction },
        );
      }

      case 'set_budget': {
        const amount = parseAmount(text);
        const category = matchCategory(text, categories, 'expense');
        if (!amount || !category) {
          return done(
            !amount
              ? `What monthly limit would you like${category ? ` for ${category.name}` : ''}? For example: "set a budget of 5000 for dining".`
              : `Which category is the ${fm(amount)} budget for?`,
          );
        }
        const target = month ?? toMonthKey(now);
        const r = await call('propose_budget', { category: category.name, limit_rupees: fromMinor(amount), month: target });
        if (!r.pendingAction) return done(`I couldn't draft that budget: ${r.result.error}`);
        return done(
          `Drafted a **${fm(amount)}** budget for ${category.name} in ${formatMonthLabel(target)}. Tap Confirm to save it.`,
          { pendingAction: r.pendingAction },
        );
      }

      case 'invest_advice': {
        const r = await call('find_learning_articles', { query: 'asset allocation' });
        return done(
          "I can't tell you whether to buy or sell anything, and Kosha is not a SEBI-registered investment adviser. What I can do is show the latest official numbers for a stock, index or fund and explain what they mean, so you can judge for yourself. Try \"tell me about Reliance stock\" or \"how is the UTI Nifty 50 index fund doing\". For advice about your own situation, speak to a SEBI-registered adviser. This guide is a good place to start:",
          { data: r.data },
        );
      }

      case 'learn': {
        const r = await call('find_learning_articles', { query: text });
        const top = r.result.articles[0];
        if (!top) return done("I don't have a guide on that yet. Try asking about saving, SIPs, mutual funds, insurance or UPI safety.");
        return done(`The Learn section has a guide on this: **${top.title}**. ${top.summary} Open it from the card below.`, { data: r.data });
      }

      case 'market_overview': {
        const r = await call('get_market_overview', {});
        if (r.result.error) return done(r.result.error === 'Market data is not available here.' ? r.result.error : MARKET_DOWN);
        const m = r.result;
        const idx = (name) => m.indices.find((i) => i.name === name);
        const parts = ['Nifty 50', 'Nifty Bank', 'Nifty IT'].map(idx).filter(Boolean).map((i) => `the ${i.name} at ${i.close} (${i.change_pct})`);
        let reply = `On ${dayLong(m.as_of)}, ${parts.join(', ')}. ${m.breadth.advancing.toLocaleString('en-IN')} stocks advanced and ${m.breadth.declining.toLocaleString('en-IN')} declined.`;
        if (m.top_gainers[0]) reply += ` Biggest Nifty 50 gainer: ${m.top_gainers[0].symbol} (${m.top_gainers[0].change_pct}).`;
        if (m.top_losers[0]) reply += ` Biggest loser: ${m.top_losers[0].symbol} (${m.top_losers[0].change_pct}).`;
        reply += ' These are end-of-day figures from the NSE, not live, and not advice.';
        return done(reply, { data: r.data });
      }

      case 'stock_info': {
        const query = subjectOf(text);
        if (!query) return done('Which company? For example: "tell me about Reliance stock".');
        const r = await call('get_stock', { query });
        if (r.result.error) return done(r.result.error.startsWith('Market data') ? MARKET_DOWN : r.result.error);
        const s = r.result;
        const alsoStock = s.other_matches?.length ? ` (Closest match for "${query}". Also matched: ${s.other_matches.join('; ')}.)` : '';
        return done(
          `**${s.name}** (${s.symbol}) closed at **${s.close}** on ${dayLong(s.as_of)}, ${s.change_pct} on the day. Its price moved ${s.returns['1 month']} over 1 month and ${s.returns['1 year']} over 1 year. These are end-of-day prices, not adjusted for splits or dividends, and not advice.${alsoStock}`,
          { data: r.data },
        );
      }

      case 'fund_info': {
        const query = subjectOf(text);
        if (!query) return done('Which fund? For example: "how is the UTI Nifty 50 index fund doing".');
        const r = await call('get_fund', { query });
        if (r.result.error) return done(r.result.error.startsWith('Market data') ? MARKET_DOWN : r.result.error);
        const f = r.result;
        const alsoFund = f.matched_exactly === false || f.other_matches?.length ? ` (${f.matched_exactly === false ? 'Closest match' : 'Matched'} for "${query}". Also matched: ${(f.other_matches ?? []).join('; ') || 'none'}.)` : '';
        return done(
          `**${f.name}** has a NAV of ${f.nav} (${dayLong(f.nav_date)}). Returns: 1 year ${f.returns['1 year']}, 3 years ${f.returns['3 years']}, 5 years ${f.returns['5 years']}. It has fallen as much as ${f.worst_fall}. Past performance does not predict future returns, and this is not advice.${alsoFund}`,
          { data: r.data },
        );
      }

      case 'watchlist': {
        const r = await call('get_watchlist', {});
        if (r.result.error) return done(MARKET_DOWN);
        if (!r.result.count) return done('Your watchlist is empty. Open a stock, index or fund in Markets and choose Add to watchlist.');
        const list = r.result.items.slice(0, 6).map((i) => `${i.name} ${i.latest} (${i.change_pct})`).join('; ');
        return done(`You are watching ${r.result.count}: ${list}. End-of-day figures, not live.`);
      }

      default:
        return done(
          `I'm here to help with your money in Kosha: spending, budgets, trends and logging transactions. Try "${pick(SUGGESTIONS, text)}"`,
        );
    }
  }

  return { name: 'offline', respond };
}
