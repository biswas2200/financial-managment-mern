import { describe, it, expect } from 'vitest';
import { createMarketService } from '../../../src/markets/service.js';
import { MF_UNIVERSE, FUND_CATEGORIES } from '../../../src/markets/universe.js';
import { pctChange, cagr } from '../../../src/markets/returns.js';
import {
  LATEST, NOW_MONDAY_MORNING, STOCKS, FUNDS, INDICES,
  fakeNse, fakeMf, stockClose, stockPrevClose, indexClose, navOn, previousWeekday,
} from '../../helpers/markets.js';

const make = (opts = {}, { nse = fakeNse(), mf = fakeMf(), now = NOW_MONDAY_MORNING } = {}) => {
  const clock = { t: now.getTime() };
  const service = createMarketService({ fetchBuffer: nse.fetchBuffer, fetchJson: mf.fetchJson, now: () => new Date(clock.t), ...opts });
  return { service, nse, mf, clock };
};
const stock = (symbol) => STOCKS.find((s) => s.symbol === symbol);
const index = (name) => INDICES.find((i) => i.name === name);

describe('market overview', () => {
  it('uses the newest published trading day, skipping the weekend before Monday\'s files exist', async () => {
    const { service } = make();
    const o = await service.overview();
    expect(o.asOf).toBe(LATEST);
    expect(o.source).toMatchObject({ name: 'NSE India', kind: 'end-of-day' });
  });

  it('shows the headline indices in a fixed order with tidy names', async () => {
    const o = await make().service.overview();
    expect(o.indices.map((i) => i.name)).toEqual(['Nifty 50', 'Nifty Bank', 'Nifty IT', 'Nifty Midcap 100', 'Nifty Smallcap 100', 'India VIX']);
    const nifty = o.indices[0];
    expect(nifty.close).toBe(indexClose(index('Nifty 50'), LATEST));
    expect(nifty).toMatchObject({ pe: 20.49, pb: 3.08, dividendYield: 1.4 });
    expect(nifty.change).toBeCloseTo(indexClose(index('Nifty 50'), LATEST) - indexClose(index('Nifty 50'), previousWeekday(LATEST)), 1);
    expect(o.indices.at(-1).pe).toBeNull();
  });

  it('lists sector indices best performer first', async () => {
    const o = await make().service.overview();
    const names = o.sectors.map((s) => s.name);
    expect(names).toEqual(expect.arrayContaining(['Nifty Auto', 'Nifty Pharma', 'Nifty Bank', 'Nifty IT']));
    const pcts = o.sectors.map((s) => s.changePct);
    expect(pcts).toEqual([...pcts].sort((a, b) => b - a));
  });

  it('finds Nifty 50 gainers, losers and the most traded, and counts the whole market', async () => {
    const o = await make().service.overview();
    expect(o.gainers.map((s) => s.symbol)).toEqual(['AAA']); // DDD is not in the Nifty 50; CCC did not move
    expect(o.losers.map((s) => s.symbol)).toEqual(['BBB']);
    expect(o.mostActive.map((s) => s.symbol)).toEqual(['BBB', 'AAA', 'CCC']); // by rupee value traded
    const aaa = o.gainers[0];
    expect(aaa.close).toBe(stockClose(stock('AAA'), LATEST));
    expect(aaa.changePct).toBe(pctChange(stockClose(stock('AAA'), LATEST), stockPrevClose(stock('AAA'), LATEST)));
    expect(aaa.industry).toBe('Financial Services');
    expect(o.breadth).toEqual({ advancers: 2, decliners: 1, unchanged: 1, total: 4 }); // the BE-series bond is not counted
  });

  it('does not download again within the cache window', async () => {
    const { service, nse } = make();
    await service.overview();
    const after = nse.calls.length;
    await service.overview();
    await service.stockDetail('AAA');
    expect(nse.calls.filter((u) => /ind_close_all_13112026/.test(u))).toHaveLength(1);
    expect(nse.calls.length - after).toBeGreaterThanOrEqual(0);
    const bhav = nse.calls.filter((u) => /BhavCopy.*20261113/.test(u));
    expect(bhav).toHaveLength(1);
  });

  it('picks up Monday\'s files once they are published and the short cache has expired', async () => {
    const { service, nse, clock } = make();
    expect((await service.overview()).asOf).toBe(LATEST);
    nse.published.add('2026-11-16');
    clock.t = new Date('2026-11-16T14:00:00Z').getTime(); // 19:30 in India
    expect((await service.overview()).asOf).toBe('2026-11-16');
  });

  it('copes with a market holiday by using the day before', async () => {
    const { service } = make({}, { nse: fakeNse({ skip: new Set([LATEST]) }) });
    expect((await service.overview()).asOf).toBe('2026-11-12');
  });

  it('says the data is unavailable, rather than inventing it, when the exchange refuses us', async () => {
    const { service } = make({}, { nse: fakeNse({ fail: true }) });
    await expect(service.overview()).rejects.toMatchObject({ status: 503, code: 'MARKET_DATA_UNAVAILABLE' });
  });

  it('says so too when no file exists for the last ten days', async () => {
    const { service } = make({}, { nse: fakeNse({ publishedFrom: '2030-01-01' }) });
    await expect(service.overview()).rejects.toMatchObject({ status: 503, code: 'MARKET_DATA_UNAVAILABLE' });
  });
});

describe('stocks', () => {
  it('searches by symbol or company name, symbol matches first', async () => {
    const { service } = make();
    expect((await service.searchStocks('aa')).map((s) => s.symbol)).toEqual(['AAA']);
    expect((await service.searchStocks('motors')).map((s) => s.symbol)).toEqual(['BBB']);
    expect((await service.searchStocks('ltd')).map((s) => s.symbol).sort()).toEqual(['AAA', 'BBB', 'CCC', 'DDD']);
    expect(await service.searchStocks('zzzz')).toEqual([]);
  });

  it('shows today\'s quote with the industry and Nifty 50 membership', async () => {
    const d = await make().service.stockDetail('aaa');
    expect(d).toMatchObject({ symbol: 'AAA', name: 'AAA FINANCE LTD', industry: 'Financial Services', inNifty50: true, asOf: LATEST });
    expect(d.close).toBe(stockClose(stock('AAA'), LATEST));
    expect(d.prevClose).toBe(stockPrevClose(stock('AAA'), LATEST));
    expect(d.change).toBeCloseTo(d.close - d.prevClose, 2);
    expect((await make().service.stockDetail('DDD')).inNifty50).toBe(false);
  });

  it('works out returns from official closes on earlier trading days', async () => {
    const d = await make().service.stockDetail('AAA');
    expect(d.returns.map((r) => r.period)).toEqual(['1W', '1M', '3M', '6M', '1Y']);
    const expected = { '1W': '2026-11-06', '1M': '2026-10-13', '3M': '2026-08-13', '6M': '2026-05-13', '1Y': '2025-11-13' };
    for (const r of d.returns) {
      expect(r.from).toBe(expected[r.period]);
      expect(r.pct).toBe(pctChange(d.close, stockClose(stock('AAA'), expected[r.period])));
      expect(r.annualised).toBe(false);
    }
  });

  it('shows a fall as a negative return and no move as zero', async () => {
    const { service } = make();
    expect((await service.stockDetail('BBB')).returns.find((r) => r.period === '1Y').pct).toBeLessThan(0);
    expect((await service.stockDetail('CCC')).returns.find((r) => r.period === '1Y').pct).toBe(0);
  });

  it('is honest that returns are prices only', async () => {
    const d = await make().service.stockDetail('AAA');
    expect(d.note).toMatch(/not adjusted for splits|bonus|dividends/i);
    expect(d.note).toMatch(/end-of-day/i);
  });

  it('reuses downloaded days across stocks', async () => {
    const { service, nse } = make();
    await service.stockDetail('AAA');
    const calls = nse.calls.length;
    await service.stockDetail('BBB');
    await service.stockDetail('CCC');
    expect(nse.calls.length).toBe(calls);
  });

  it('answers 404 for a symbol it has never seen, and rejects odd input', async () => {
    const { service } = make();
    await expect(service.stockDetail('NOPE')).rejects.toMatchObject({ status: 404 });
    await expect(service.stockDetail('XYZ')).rejects.toMatchObject({ status: 404 }); // a bond series, not an equity
  });
});

describe('Nifty 50 list', () => {
  it('lists every Nifty 50 company with its quote and industry, by symbol', async () => {
    const r = await make().service.nifty50();
    expect(r.asOf).toBe(LATEST);
    expect(r.items.map((s) => s.symbol)).toEqual(['AAA', 'BBB', 'CCC']);
    expect(r.items[0]).toMatchObject({ name: 'AAA FINANCE LTD', industry: 'Financial Services', close: stockClose(stock('AAA'), LATEST) });
    expect(r.items[1].changePct).toBeLessThan(0);
    expect(r.items.every((s) => typeof s.valueCr === 'number')).toBe(true);
  });
});

describe('stock search puts the company you mean first', () => {
  const EXTRA = [
    { symbol: 'SBIN', name: 'STATE BANK OF INDIA', isin: 'INE062A01020', industry: 'Financial Services', nifty50: true, base: 800, slope: 0, jump: 0, volume: 9_000_000 },
    { symbol: 'SBILIFE', name: 'SBI LIFE INSURANCE COMPANY LTD', isin: 'INE123W01016', industry: 'Financial Services', nifty50: true, base: 1500, slope: 0, jump: 0, volume: 800_000 },
    { symbol: 'SBICARD', name: 'SBI CARDS AND PAYMENT SERVICES LTD', isin: 'INE018E01016', industry: 'Financial Services', nifty50: false, base: 700, slope: 0, jump: 0, volume: 700_000 },
    { symbol: 'SBIETF', name: 'SBI NIFTY 50 ETF', isin: 'INF200K01RO2', industry: null, nifty50: false, base: 250, slope: 0, jump: 0, volume: 60_000 },
    { symbol: 'LT', name: 'LARSEN & TOUBRO LTD', isin: 'INE018A01030', industry: 'Construction', nifty50: true, base: 3600, slope: 0, jump: 0, volume: 1_500_000 },
    { symbol: 'LTF', name: 'L&T FINANCE LTD', isin: 'INE498L01015', industry: 'Financial Services', nifty50: false, base: 260, slope: 0, jump: 0, volume: 2_000_000 },
    { symbol: 'LTTS', name: 'L&T TECHNOLOGY SERVICES LTD', isin: 'INE010V01017', industry: 'IT', nifty50: false, base: 4200, slope: 0, jump: 0, volume: 120_000 },
  ];
  const svc = () => make({}, { nse: fakeNse({ extra: EXTRA }) }).service;

  it('ranks by how well the symbol matches, then Nifty 50 membership, then how much was traded', async () => {
    expect((await svc().searchStocks('sbi')).map((s) => s.symbol)).toEqual(['SBIN', 'SBILIFE', 'SBICARD', 'SBIETF']);
  });

  it('puts an exact symbol before longer symbols that start the same way', async () => {
    const r = await svc().searchStocks('lt');
    expect(r[0].symbol).toBe('LT');
    expect(r.map((s) => s.symbol)).toEqual(expect.arrayContaining(['LTF', 'LTTS']));
  });

  it('understands the names people actually use for the biggest companies', async () => {
    expect((await svc().searchStocks('l&t'))[0].symbol).toBe('LT');
    expect((await svc().searchStocks('larsen'))[0].symbol).toBe('LT');
    expect((await svc().searchStocks('sbi'))[0].symbol).toBe('SBIN');
  });

  it('puts matches inside a company name after matches on its symbol', async () => {
    const r = await svc().searchStocks('bank');
    expect(r.map((s) => s.symbol)).toContain('SBIN');
  });
});

describe('fund search puts the scheme you named first', () => {
  const NEXT50 = { code: 143341, name: 'UTI Nifty Next 50 Index Fund - Direct Plan - Growth', house: 'UTI Mutual Fund', category: 'Other Scheme - Index Funds', growth: 0.0003, since: '2018-01-02' };
  const svc = () => make({}, { mf: fakeMf({ extra: [NEXT50] }) }).service;

  it('prefers a name that contains everything you typed, in order, over one that merely has the same words', async () => {
    const r = await svc().searchFunds('uti nifty 50 index fund');
    expect(r.map((f) => f.code)).toEqual([120716, 143341]);
  });

  it('still finds the close matches after the exact one', async () => {
    const r = await svc().searchFunds('uti nifty index');
    expect(r.map((f) => f.code)).toEqual(expect.arrayContaining([120716, 143341]));
  });
});

describe('indices', () => {
  it('shows the level, valuation and returns including 3 and 5 years annualised', async () => {
    const d = await make().service.indexDetail('nifty 50');
    const n50 = index('Nifty 50');
    expect(d).toMatchObject({ name: 'Nifty 50', asOf: LATEST, pe: 20.49, pb: 3.08, dividendYield: 1.4 });
    expect(d.returns.map((r) => r.period)).toEqual(['1M', '3M', '6M', '1Y', '3Y', '5Y']);
    const y3 = d.returns.find((r) => r.period === '3Y');
    expect(y3).toMatchObject({ from: '2023-11-13', annualised: true });
    expect(y3.pct).toBe(cagr(d.close, indexClose(n50, '2023-11-13'), 3));
    const y5 = d.returns.find((r) => r.period === '5Y');
    expect(y5.from).toBe('2021-11-12'); // the 13th of Nov 2021 was a Saturday
    expect(y5.pct).toBe(cagr(d.close, indexClose(n50, '2021-11-12'), 5));
  });

  it('matches names regardless of case, and answers 404 for an unknown index', async () => {
    const { service } = make();
    expect((await service.indexDetail('NIFTY MIDCAP 100')).name).toBe('Nifty Midcap 100');
    await expect(service.indexDetail('Nifty Nonsense')).rejects.toMatchObject({ status: 404 });
  });

  it('leaves a return empty where the exchange has no file that far back', async () => {
    const { service } = make({}, { nse: fakeNse({ publishedFrom: '2025-06-01' }) });
    const d = await service.indexDetail('Nifty 50');
    expect(d.returns.find((r) => r.period === '1Y').pct).not.toBeNull();
    expect(d.returns.find((r) => r.period === '3Y').pct).toBeNull();
    expect(d.returns.find((r) => r.period === '5Y').pct).toBeNull();
  });
});

describe('mutual funds', () => {
  it('knows the categories and a curated, de-duplicated universe of direct growth schemes', () => {
    expect(FUND_CATEGORIES.map((c) => c.id)).toEqual(['index', 'large', 'flexi', 'mid', 'small', 'elss', 'hybrid', 'debt', 'gold']);
    const codes = MF_UNIVERSE.map((f) => f.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const f of MF_UNIVERSE) {
      expect(Number.isInteger(f.code) && f.code > 0).toBe(true);
      expect(FUND_CATEGORIES.some((c) => c.id === f.category), `${f.code} category`).toBe(true);
    }
    for (const c of FUND_CATEGORIES) expect(MF_UNIVERSE.filter((f) => f.category === c.id).length, c.id).toBeGreaterThanOrEqual(2);
  });

  it('searches by name and prefers direct growth plans', async () => {
    const { service } = make();
    const r = await service.searchFunds('nifty 50');
    expect(r.map((f) => f.code).sort()).toEqual([119063, 120716]);
    expect(r[0]).toEqual({ code: expect.any(Number), name: expect.any(String) });
  });

  it('shows NAV, returns (1 year absolute, 3 and 5 years annualised), history and risk', async () => {
    const f = FUNDS[0];
    const d = await make().service.fundDetail(f.code);
    expect(d).toMatchObject({ code: f.code, name: f.name, house: 'UTI Mutual Fund', category: 'Other Scheme - Index Funds', nav: navOn(f, LATEST), navDate: LATEST });
    const nav = (day) => navOn(f, day);
    const get = (p) => d.returns.find((r) => r.period === p);
    expect(get('1Y').pct).toBe(pctChange(nav(LATEST), nav('2025-11-13')));
    expect(get('3Y').pct).toBe(cagr(nav(LATEST), nav('2023-11-13'), 3));
    expect(get('5Y')).toMatchObject({ annualised: true });
    expect(d.sinceLaunch).toMatchObject({ since: '2013-01-02' });
    expect(d.sinceLaunch.pct).toBeGreaterThan(0);
    expect(d.risk.maxDrawdownPct).toBeGreaterThan(29);
    expect(d.risk.maxDrawdownPct).toBeLessThan(31);
    expect(d.risk.positiveYearShare).toBeGreaterThan(90);
    expect(d.risk.positiveYearShare).toBeLessThan(100);
    expect(d.history.length).toBeLessThanOrEqual(130);
    expect(d.history.at(-1)).toEqual({ day: LATEST, nav: nav(LATEST) });
    expect(d.history[0].day >= '2021-11-01').toBe(true);
    expect(d.note).toMatch(/past performance/i);
  });

  it('does not invent long-period returns for a young fund', async () => {
    const d = await make().service.fundDetail(999001);
    expect(d.returns.find((r) => r.period === '6M').pct).not.toBeNull();
    for (const p of ['1Y', '3Y', '5Y']) expect(d.returns.find((r) => r.period === p).pct, p).toBeNull();
    expect(d.sinceLaunch).toBeNull();
  });

  it('answers 404 for a scheme that does not exist', async () => {
    await expect(make().service.fundDetail(555555)).rejects.toMatchObject({ status: 404 });
  });

  it('ranks a category by 3-year return and skips schemes the data source cannot supply', async () => {
    const { service } = make();
    const r = await service.topFunds('index');
    expect(r.category).toMatchObject({ id: 'index' });
    expect(r.rankedBy).toBe('3Y');
    expect(r.items.map((f) => f.code)).toEqual([119063, 120716]); // 0.06% a day beats 0.04% a day
    expect(r.items[0].returns.map((x) => x.period)).toEqual(['1Y', '3Y', '5Y']);
    expect(r.items[0]).toMatchObject({ name: FUNDS[1].name, navDate: LATEST });
    expect(r.disclaimer).toMatch(/not a recommendation/i);
  });

  it('rejects an unknown category', async () => {
    await expect(make().service.topFunds('crypto')).rejects.toMatchObject({ status: 400 });
  });

  it('reuses a downloaded scheme instead of asking again', async () => {
    const { service, mf } = make();
    await service.fundDetail(120716);
    await service.fundDetail(120716);
    expect(mf.calls.filter((u) => u.endsWith('/mf/120716'))).toHaveLength(1);
  });

  it('says the data is unavailable when the fund data source is down', async () => {
    const { service } = make({}, { mf: fakeMf({ fail: true }) });
    await expect(service.fundDetail(120716)).rejects.toMatchObject({ status: 503, code: 'MARKET_DATA_UNAVAILABLE' });
    await expect(service.topFunds('index')).rejects.toMatchObject({ status: 503, code: 'MARKET_DATA_UNAVAILABLE' });
  });
});

describe('describing a watchlist entry', () => {
  it('gives a label, price and change for a stock, an index and a fund', async () => {
    const { service } = make();
    expect(await service.describe('stock', 'aaa')).toMatchObject({ kind: 'stock', ref: 'AAA', label: 'AAA FINANCE LTD', price: stockClose(stock('AAA'), LATEST), asOf: LATEST });
    expect(await service.describe('index', 'nifty bank')).toMatchObject({ kind: 'index', ref: 'Nifty Bank', label: 'Nifty Bank' });
    const f = await service.describe('fund', '120716');
    expect(f).toMatchObject({ kind: 'fund', ref: '120716', label: FUNDS[0].name, price: navOn(FUNDS[0], LATEST) });
    expect(f.changePct).toBe(pctChange(navOn(FUNDS[0], LATEST), navOn(FUNDS[0], previousWeekday(LATEST))));
  });

  it('answers 404 for something that does not exist', async () => {
    const { service } = make();
    await expect(service.describe('stock', 'NOPE')).rejects.toMatchObject({ status: 404 });
    await expect(service.describe('fund', '555555')).rejects.toMatchObject({ status: 404 });
    await expect(service.describe('index', 'Nope Index')).rejects.toMatchObject({ status: 404 });
  });
});
