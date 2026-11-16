import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { createToolExecutor, toolDeclarations } from '../../../src/agent/tools.js';
import { buildSystemPrompt } from '../../../src/agent/prompt.js';
import { createMarketService } from '../../../src/markets/service.js';
import { fakeNse, fakeMf, NOW_MONDAY_MORNING, FUNDS } from '../../helpers/markets.js';

const markets = (opts = {}) =>
  createMarketService({ fetchBuffer: (opts.nse ?? fakeNse()).fetchBuffer, fetchJson: (opts.mf ?? fakeMf()).fetchJson, now: () => NOW_MONDAY_MORNING });
const executor = (opts) => createToolExecutor({ userId: new mongoose.Types.ObjectId(), categories: [], markets: markets(opts), now: NOW_MONDAY_MORNING });

describe('Copilot market tools', () => {
  it('declares tools for the market, stocks, indices, funds, the watchlist and the guides', () => {
    const names = toolDeclarations.map((t) => t.name);
    for (const n of ['get_market_overview', 'get_stock', 'get_index', 'get_fund', 'get_watchlist', 'find_learning_articles']) expect(names).toContain(n);
    for (const t of toolDeclarations.filter((x) => ['get_stock', 'get_fund'].includes(x.name))) expect(t.parametersJsonSchema.required).toContain('query');
  });

  it('summarises the day: indices, breadth and movers, and says it is end-of-day', async () => {
    const { result, data } = await executor().run('get_market_overview', {});
    expect(result.as_of).toBe('2026-11-13');
    expect(result.note).toMatch(/end-of-day/i);
    expect(result.indices[0]).toMatchObject({ name: 'Nifty 50' });
    expect(result.breadth).toMatchObject({ advancing: 2, declining: 1, unchanged: 1 });
    expect(result.top_gainers[0]).toMatchObject({ symbol: 'AAA' });
    expect(data.kind).toBe('market');
  });

  it('looks a stock up by symbol or name and gives its returns, flagged as price only', async () => {
    const byName = await executor().run('get_stock', { query: 'aaa finance' });
    expect(byName.result).toMatchObject({ symbol: 'AAA', name: 'AAA FINANCE LTD', as_of: '2026-11-13' });
    expect(byName.result.returns['1 year']).toMatch(/%/);
    expect(byName.result.note).toMatch(/not adjusted/i);
    expect(byName.data).toMatchObject({ kind: 'quote', type: 'stock', symbol: 'AAA' });
    const bySymbol = await executor().run('get_stock', { query: 'BBB' });
    expect(bySymbol.result.symbol).toBe('BBB');
  });

  it('says it could not find a stock, and does not guess one', async () => {
    const { result } = await executor().run('get_stock', { query: 'zzzzqq' });
    expect(result.error).toMatch(/could not find/i);
    expect(result.symbol).toBeUndefined();
  });

  it('describes an index with its valuation', async () => {
    const { result, data } = await executor().run('get_index', { name: 'nifty bank' });
    expect(result).toMatchObject({ name: 'Nifty Bank', pe: 13.49 });
    expect(data).toMatchObject({ kind: 'quote', type: 'index' });
    expect((await executor().run('get_index', { name: 'nonsense' })).result.error).toMatch(/could not find/i);
  });

  it('describes a fund from its code or a name, with returns and risk', async () => {
    const byCode = await executor().run('get_fund', { query: '120716' });
    expect(byCode.result).toMatchObject({ name: FUNDS[0].name, fund_house: 'UTI Mutual Fund' });
    expect(byCode.result.returns).toHaveProperty('3 years');
    expect(byCode.result.worst_fall).toMatch(/%/);
    expect(byCode.result.note).toMatch(/past performance/i);
    const byName = await executor().run('get_fund', { query: 'uti nifty 50 index' });
    expect(byName.result.name).toBe(FUNDS[0].name);
    expect(byName.data).toMatchObject({ kind: 'quote', type: 'fund' });
    expect((await executor().run('get_fund', { query: 'no such fund' })).result.error).toMatch(/could not find/i);
  });

  it('reports a data source outage as a plain error, not an exception', async () => {
    const down = { nse: fakeNse({ fail: true }), mf: fakeMf({ fail: true }) };
    for (const [tool, args] of [['get_market_overview', {}], ['get_stock', { query: 'aaa' }], ['get_index', { name: 'Nifty 50' }], ['get_fund', { query: '120716' }]]) {
      const { result } = await executor(down).run(tool, args);
      expect(result.error, tool).toMatch(/not reachable/i);
    }
  });

  it('finds the matching guides, with a link to open each', async () => {
    const { result, data } = await executor().run('find_learning_articles', { query: 'emergency fund' });
    expect(result.articles[0]).toMatchObject({ slug: 'emergency-fund', link: '/learn/emergency-fund' });
    expect(data.kind).toBe('articles');
    expect(data.items[0].slug).toBe('emergency-fund');
    const none = await executor().run('find_learning_articles', { query: 'zzzzqq' });
    expect(none.result.articles).toEqual([]);
  });
});

describe('Copilot looks up the company or fund you meant', () => {
  const EXTRA = [
    { symbol: 'SBIN', name: 'STATE BANK OF INDIA', isin: 'INE062A01020', industry: 'Financial Services', nifty50: true, base: 800, slope: 0, jump: 0, volume: 9_000_000 },
    { symbol: 'SBIETF', name: 'SBI NIFTY 50 ETF', isin: 'INF200K01RO2', industry: null, nifty50: false, base: 250, slope: 0, jump: 0, volume: 60_000 },
    { symbol: 'LT', name: 'LARSEN & TOUBRO LTD', isin: 'INE018A01030', industry: 'Construction', nifty50: true, base: 3600, slope: 0, jump: 0, volume: 1_500_000 },
    { symbol: 'LTF', name: 'L&T FINANCE LTD', isin: 'INE498L01015', industry: 'Financial Services', nifty50: false, base: 260, slope: 0, jump: 0, volume: 2_000_000 },
  ];
  const NEXT50 = { code: 143341, name: 'UTI Nifty Next 50 Index Fund - Direct Plan - Growth', house: 'UTI Mutual Fund', category: 'Other Scheme - Index Funds', growth: 0.0003, since: '2018-01-02' };
  const ex = () => executor({ nse: fakeNse({ extra: EXTRA }), mf: fakeMf({ extra: [NEXT50] }) });

  it('picks State Bank of India for "sbi" and Larsen & Toubro for "l&t", and mentions the other matches', async () => {
    const sbi = await ex().run('get_stock', { query: 'sbi' });
    expect(sbi.result).toMatchObject({ symbol: 'SBIN', name: 'STATE BANK OF INDIA' });
    expect(sbi.result.other_matches).toEqual(['SBIETF: SBI NIFTY 50 ETF']);
    expect((await ex().run('get_stock', { query: 'l&t' })).result.symbol).toBe('LT');
  });

  it('picks the fund whose name holds what you typed, and lists the near misses', async () => {
    const r = await ex().run('get_fund', { query: 'uti nifty 50 index fund' });
    expect(r.result.name).toBe(FUNDS[0].name);
    expect(r.result.other_matches).toEqual([NEXT50.name]);
    expect(r.result.matched_exactly).toBe(true);
  });

  it('says when it is guessing the closest match', async () => {
    const r = await ex().run('get_fund', { query: 'uti nifty index' });
    expect(r.result.matched_exactly).toBe(false);
  });
});

describe('Copilot system prompt', () => {
  const prompt = buildSystemPrompt({ user: { name: 'Meera Iyer' }, categories: [], now: NOW_MONDAY_MORNING });

  it('tells Gemini about the market tools and that the data is end-of-day', () => {
    expect(prompt).toContain('get_market_overview');
    expect(prompt).toMatch(/end-of-day/i);
  });

  it('forbids recommending what to buy, sell or hold, and says Kosha is not an adviser', () => {
    expect(prompt).toMatch(/never (recommend|tell)[^.]*(buy|sell)/i);
    expect(prompt).toMatch(/not a SEBI-registered/i);
  });

  it('asks it to name the match it used when the tool lists other matches', () => {
    expect(prompt).toContain('other_matches');
    expect(prompt).toMatch(/closest match/i);
  });

  it('only refuses to recommend financial investments, so everyday purchase questions are not refused', () => {
    expect(prompt).toMatch(/everyday purchase|buying a house|groceries/i);
  });

  it('asks it to point to a guide and to say what a number cannot tell you', () => {
    expect(prompt).toContain('find_learning_articles');
    expect(prompt).toMatch(/cannot tell/i);
  });
});
