import { describe, it, expect } from 'vitest';
import { classifyIntent } from '../../../src/agent/intents.js';

describe('classifyIntent: markets, funds, learning and investing questions', () => {
  it.each([
    ['how is the market doing today', 'market_overview'],
    ['how is the nifty doing', 'market_overview'],
    ['what are the top gainers today', 'market_overview'],
    ['how did the sensex do', 'market_overview'],
    ['tell me about reliance stock', 'stock_info'],
    ['what is the price of tcs share', 'stock_info'],
    ['how is hdfc bank stock doing', 'stock_info'],
    ['how is the uti nifty 50 index fund doing', 'fund_info'],
    ['tell me about parag parikh flexi cap mutual fund', 'fund_info'],
    ['nav of axis small cap fund', 'fund_info'],
    ['show my watchlist', 'watchlist'],
    ["what's on my watch list", 'watchlist'],
    ['what is an emergency fund', 'learn'],
    ['explain sip to me', 'learn'],
    ['how do I start investing', 'learn'],
    ['what is a p/e ratio', 'learn'],
    ['what is a mutual fund', 'learn'],
    ['should I buy reliance', 'invest_advice'],
    ['which mutual fund should I invest in', 'invest_advice'],
    ['best stock to buy now', 'invest_advice'],
    ['is it a good time to sell my shares', 'invest_advice'],
  ])('%s → %s', (text, intent) => {
    expect(classifyIntent(text)).toBe(intent);
  });

  it.each([
    ['spent 5000 on sip', 'add_transaction'],
    ['paid 1200 for mutual fund', 'add_transaction'],
    ['what is my biggest expense', 'top_expense'],
    ["what's my balance", 'summary'],
    ['should I buy a laptop', 'fallback'],
    ['show my supermarket expenses', 'find_transactions'],
    ['how much did I spend this month?', 'summary'],
    ['set a budget of 5000 for shopping', 'set_budget'],
    ['what is the capital of france', 'fallback'],
  ])('still sends %s to %s', (text, intent) => {
    expect(classifyIntent(text)).toBe(intent);
  });
});

describe('classifyIntent: questions about your own money are not hijacked by market words', () => {
  it.each([
    ['how much did I spend on mutual funds this month', 'summary'],
    ['how much did I spend on stock market courses', 'summary'],
    ['what share of my income goes to rent', 'summary'],
    ['how much did I pay in sip last month', 'summary'],
  ])('%s → %s', (text, intent) => {
    expect(classifyIntent(text)).toBe(intent);
  });

  it.each([
    'my share of the rent',
    'should I buy more groceries this week',
    'what should I buy for dinner',
    'can I buy a coffee every day',
    'should I buy a house',
    'is it worth it to buy a new phone',
    'shall I buy tickets for the trip',
  ])('does not treat "%s" as stock, fund or investing advice', (text) => {
    expect(['stock_info', 'fund_info', 'market_overview', 'invest_advice', 'learn']).not.toContain(classifyIntent(text));
  });
});

describe('classifyIntent: asking for the figure is not asking for an explanation', () => {
  it.each([
    ['what is the NAV of Parag Parikh Flexi Cap', 'fund_info'],
    ['what is the nifty today', 'market_overview'],
    ['what is the sensex now', 'market_overview'],
    ['what is the price of tcs share', 'stock_info'],
    ['what is nav', 'learn'],
    ['what is a mutual fund', 'learn'],
    ['explain sip to me', 'learn'],
    ['what is a p/e ratio', 'learn'],
  ])('%s → %s', (text, intent) => {
    expect(classifyIntent(text)).toBe(intent);
  });
});

describe('classifyIntent: "how is X doing"', () => {
  it.each([
    ['how is reliance doing', 'stock_info'],
    ["how's infosys", 'stock_info'],
    ['how did hdfc bank do today', 'stock_info'],
    ['how is my budget doing', 'budget_status'],
    ['how is this month going', 'summary'],
    ['how am I doing', 'summary'],
  ])('%s → %s', (text, intent) => {
    expect(classifyIntent(text)).toBe(intent);
  });

  it('does not take a greeting for a company', () => {
    expect(classifyIntent('how are you')).not.toBe('stock_info');
  });
});
