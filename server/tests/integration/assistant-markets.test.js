import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../../src/app.js';
import { createMarketService } from '../../src/markets/service.js';
import { useTestDatabase } from '../helpers/db.js';
import { signUp } from '../helpers/auth.js';
import { fakeNse, fakeMf, NOW_MONDAY_MORNING, FUNDS } from '../helpers/markets.js';

const base = '/api/v1/assistant';
const build = (opts = {}) =>
  createApp({
    markets: createMarketService({ fetchBuffer: (opts.nse ?? fakeNse()).fetchBuffer, fetchJson: (opts.mf ?? fakeMf()).fetchJson, now: () => NOW_MONDAY_MORNING }),
  });

const ask = async (ctx, text) => (await ctx.agent.post(`${base}/message`).send({ text }).expect(200)).body.message;

describe('Copilot answers market and learning questions (offline engine)', () => {
  useTestDatabase();
  const app = build();
  let ctx;
  beforeEach(async () => {
    ctx = await signUp(app, { name: 'Meera Iyer' });
  });

  it('explains the day, with the date, and says it is end-of-day', async () => {
    const m = await ask(ctx, 'how is the market doing today');
    expect(m.provider).toBe('offline');
    expect(m.toolCalls).toEqual(['get_market_overview']);
    expect(m.content).toContain('Nifty 50');
    expect(m.content).toContain('13 Nov 2026');
    expect(m.content).toMatch(/end-of-day/i);
    expect(m.content).toMatch(/not (live|advice)/i);
    expect(m.data.kind).toBe('market');
  });

  it('tells you about a stock from its official end-of-day numbers', async () => {
    const m = await ask(ctx, 'tell me about aaa stock');
    expect(m.toolCalls).toEqual(['get_stock']);
    expect(m.content).toContain('AAA FINANCE LTD');
    expect(m.content).toMatch(/₹[\d,]+\.\d{2}/);
    expect(m.content).toMatch(/1 year/i);
    expect(m.data).toMatchObject({ kind: 'quote', type: 'stock', symbol: 'AAA' });
  });

  it('says so plainly when it cannot find the stock', async () => {
    const m = await ask(ctx, 'tell me about zzzzqq stock');
    expect(m.content).toMatch(/could not find/i);
    expect(m.data).toBeFalsy();
  });

  it('tells you about a mutual fund', async () => {
    const m = await ask(ctx, 'how is the uti nifty 50 index fund doing');
    expect(m.toolCalls).toEqual(['get_fund']);
    expect(m.content).toContain(FUNDS[0].name);
    expect(m.content).toMatch(/3 years/i);
    expect(m.content).toMatch(/past performance/i);
  });

  it('lists your watchlist, or says how to start one', async () => {
    const empty = await ask(ctx, 'show my watchlist');
    expect(empty.content).toMatch(/watchlist is empty/i);
    await ctx.agent.post('/api/v1/watchlist').send({ kind: 'stock', ref: 'AAA' }).expect(201);
    await ctx.agent.post('/api/v1/watchlist').send({ kind: 'index', ref: 'Nifty 50' }).expect(201);
    const full = await ask(ctx, 'show my watchlist');
    expect(full.toolCalls).toEqual(['get_watchlist']);
    expect(full.content).toContain('AAA FINANCE LTD');
    expect(full.content).toContain('Nifty 50');
  });

  it('points to the guide that explains a term, with a card to open it', async () => {
    const m = await ask(ctx, 'what is an emergency fund');
    expect(m.toolCalls).toEqual(['find_learning_articles']);
    expect(m.content).toContain('Build an emergency fund');
    expect(m.data.kind).toBe('articles');
    expect(m.data.items[0]).toMatchObject({ slug: 'emergency-fund' });
  });

  it('will not say what to buy or sell, and offers what it can do instead', async () => {
    for (const text of ['should I buy aaa', 'best stock to buy now', 'which mutual fund should I invest in']) {
      const m = await ask(ctx, text);
      expect(m.content, text).toMatch(/can't tell you whether to buy or sell/i);
      expect(m.content).toMatch(/not a SEBI-registered/i);
      expect(m.content).not.toMatch(/you should buy|i recommend|strong buy/i);
      expect(m.data.kind).toBe('articles');
    }
  });

  it('does not treat shopping questions as investing advice', async () => {
    const m = await ask(ctx, 'should I buy a laptop');
    expect(m.content).not.toMatch(/SEBI/);
  });

  it('still logs a SIP as an expense when you say you paid one', async () => {
    const m = await ask(ctx, 'spent 5000 on sip');
    expect(m.content).not.toMatch(/watchlist|nifty/i);
  });
});

describe('Copilot with little price history', () => {
  useTestDatabase();

  it('says there is not enough history instead of printing a gap into a sentence', async () => {
    const app = build({ nse: fakeNse({ publishedFrom: '2026-11-09' }) });
    const ctx = await signUp(app);
    const m = await ask(ctx, 'tell me about aaa stock');
    expect(m.content).toContain('AAA FINANCE LTD');
    expect(m.content).toMatch(/not enough price history/i);
    expect(m.content).not.toMatch(/moved not enough/i);
  });

  it('names the other matches when it is not sure which company or fund you meant', async () => {
    const extra = [{ symbol: 'AAB', name: 'AAB TRADING LTD', isin: 'INE000E01005', industry: 'Trading', nifty50: false, base: 80, slope: 0, jump: 0, volume: 10_000 }];
    const app = build({ nse: fakeNse({ extra }) });
    const ctx = await signUp(app);
    const m = await ask(ctx, 'how is aa doing');
    expect(m.content).toMatch(/closest match/i);
    expect(m.content).toContain('AAB');
  });
});

describe('Copilot when market data is unavailable', () => {
  useTestDatabase();

  it('says it cannot reach the data instead of guessing', async () => {
    const app = build({ nse: fakeNse({ fail: true }), mf: fakeMf({ fail: true }) });
    const ctx = await signUp(app);
    for (const text of ['how is the market doing today', 'tell me about aaa stock', 'how is the uti nifty 50 index fund doing']) {
      const m = await ask(ctx, text);
      expect(m.content, text).toMatch(/not reachable|can't reach/i);
      expect(m.content).not.toMatch(/₹[\d,]+\.\d{2}/);
    }
  });
});
