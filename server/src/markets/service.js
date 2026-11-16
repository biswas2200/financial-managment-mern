/**
 * Market data for Kosha's Markets pages.
 *
 * Sources (free, no API key):
 *  - NSE India's official end-of-day files (nsearchives.nseindia.com): every index's close with its P/E, P/B and
 *    dividend yield, the "bhavcopy" with every equity's prices and volume, and the Nifty 50 / Nifty 500 lists.
 *  - AMFI NAV data through mfapi.in: search, NAV history and scheme details for mutual funds.
 *
 * Everything is end-of-day. Nothing is ever made up: when a source cannot be reached the methods throw a 503
 * with code MARKET_DATA_UNAVAILABLE and the screens say so.
 */
import { toDayKey } from '@kosha/shared';
import { ApiError } from '../utils/ApiError.js';
import { httpBuffer, httpJson } from './http.js';
import { parseIndexCsv, parseBhavcopy, parseConstituents, parseNavSeries } from './parse.js';
import {
  pctChange,
  cagr,
  shiftDays,
  valueOnOrBefore,
  periodReturns,
  maxDrawdown,
  positiveWindowShare,
  downsample,
  targetDay,
  shiftMonths,
  STOCK_PERIODS,
  INDEX_PERIODS,
  FUND_TOP_PERIODS,
} from './returns.js';
import { FUND_CATEGORIES, MF_UNIVERSE } from './universe.js';

const NSE = 'https://nsearchives.nseindia.com/content';
const MFAPI = 'https://api.mfapi.in/mf';

const ddmmyyyy = (day) => day.split('-').reverse().join('');
export const urls = {
  indexClose: (day) => `${NSE}/indices/ind_close_all_${ddmmyyyy(day)}.csv`,
  bhavcopy: (day) => `${NSE}/cm/BhavCopy_NSE_CM_0_0_0_${day.replaceAll('-', '')}_F_0000.csv.zip`,
  nifty50: `${NSE}/indices/ind_nifty50list.csv`,
  nifty500: `${NSE}/indices/ind_nifty500list.csv`,
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const LOOK_BACK_DAYS = 10; // how far back to look for the newest published day (weekends and holidays)
const FILE_SEARCH_DAYS = 7; // how far back from a target date to look for a trading day

const HEADLINE = ['Nifty 50', 'Nifty Bank', 'Nifty IT', 'Nifty Midcap 100', 'Nifty Smallcap 100', 'India VIX'];
const SECTORS = [
  'Nifty Auto', 'Nifty Bank', 'Nifty Financial Services', 'Nifty FMCG', 'Nifty IT', 'Nifty Media', 'Nifty Metal',
  'Nifty Pharma', 'Nifty PSU Bank', 'Nifty Realty', 'Nifty Energy', 'Nifty Healthcare Index', 'Nifty Consumer Durables', 'Nifty Oil & Gas',
];

const STOCK_NOTE =
  'End-of-day prices from the NSE. Returns compare closing prices only: they are not adjusted for splits, bonus issues or dividends. Not live, and not investment advice.';
const INDEX_NOTE = 'End-of-day index levels from the NSE. Returns are price returns and leave out dividends. Not live, and not investment advice.';
const FUND_NOTE = 'NAV data from AMFI via mfapi.in. Past performance does not predict future returns. Returns above one year are annualised.';
const SOURCE = { name: 'NSE India', kind: 'end-of-day', url: 'https://www.nseindia.com/' };

/** Names people use that are not the NSE symbol. Only companies whose symbol differs from their name. */
const STOCK_ALIASES = {
  'l&t': 'LT', 'l and t': 'LT', 'larsen': 'LT', sbi: 'SBIN', 'state bank': 'SBIN', hul: 'HINDUNILVR', 'hindustan unilever': 'HINDUNILVR',
  airtel: 'BHARTIARTL', infosys: 'INFY', 'tata consultancy': 'TCS', 'hdfc bank': 'HDFCBANK', 'icici bank': 'ICICIBANK', 'axis bank': 'AXISBANK',
  'kotak bank': 'KOTAKBANK', 'bajaj finance': 'BAJFINANCE', 'asian paints': 'ASIANPAINT', 'sun pharma': 'SUNPHARMA', 'mahindra': 'M&M', 'm and m': 'M&M',
};

const unavailable = () =>
  new ApiError(503, 'Market data is not reachable right now. Please try again in a few minutes.', 'MARKET_DATA_UNAVAILABLE');

const isWeekend = (day) => [0, 6].includes(new Date(`${day}T00:00:00Z`).getUTCDay());
const round2 = (n) => Math.round(n * 100) / 100;
/** The exchange writes "NIFTY Midcap 100"; show every index as "Nifty …". */
const tidyName = (name) => name.replace(/^nifty(?=\s)/i, 'Nifty');

function createMemo(now) {
  const store = new Map();
  /** One load per key; in-flight loads are shared; failures are never kept. */
  return (key, ttlMs, load) => {
    const t = now().getTime();
    const hit = store.get(key);
    if (hit && hit.expires > t) return hit.promise;
    const entry = { promise: load(), expires: ttlMs === Infinity ? Infinity : t + ttlMs };
    store.set(key, entry);
    entry.promise.catch(() => store.get(key) === entry && store.delete(key));
    return entry.promise;
  };
}

export function createMarketService({ fetchBuffer = httpBuffer, fetchJson = httpJson, now = () => new Date() } = {}) {
  const memo = createMemo(now);
  const today = () => toDayKey(now());

  const download = async (loader) => {
    try {
      return await loader();
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw unavailable();
    }
  };

  // ---------- NSE files, by trading day ----------

  /** Past days never change, so they are kept for good; today's file may not be published yet, so only briefly. */
  const dayTtl = (day) => (day < today() ? Infinity : 10 * MINUTE);

  const indexFile = (day) =>
    isWeekend(day)
      ? Promise.resolve(null)
      : memo(`index:${day}`, dayTtl(day), () =>
          download(async () => {
            const buf = await fetchBuffer(urls.indexClose(day));
            if (!buf) return null;
            const rows = parseIndexCsv(buf.toString('utf8'));
            if (!rows.length) throw new Error('Unreadable index file');
            return new Map(rows.map((r) => [tidyName(r.name).toLowerCase(), { ...r, name: tidyName(r.name) }]));
          }),
        );

  const stockFile = (day) =>
    isWeekend(day)
      ? Promise.resolve(null)
      : memo(`bhav:${day}`, dayTtl(day), () =>
          download(async () => {
            const buf = await fetchBuffer(urls.bhavcopy(day));
            return buf ? parseBhavcopy(buf) : null;
          }),
        );

  /** The newest day the exchange has published, looking back over weekends and holidays. */
  const latestDay = () =>
    memo('latest', 10 * MINUTE, async () => {
      let day = today();
      for (let i = 0; i < LOOK_BACK_DAYS; i += 1) {
        if (await indexFile(day)) return day;
        day = shiftDays(day, -1);
      }
      throw unavailable();
    });

  /** The latest published trading day on or before `target`, with that file; null if none within a week. */
  async function fileOnOrBefore(getFile, target) {
    let day = target;
    for (let i = 0; i < FILE_SEARCH_DAYS; i += 1) {
      const file = await getFile(day);
      if (file) return { day, file };
      day = shiftDays(day, -1);
    }
    return null;
  }

  const constituents = (name, url) =>
    memo(`list:${name}`, 24 * HOUR, () =>
      download(async () => {
        const buf = await fetchBuffer(url);
        const rows = buf ? parseConstituents(buf.toString('utf8')) : [];
        if (!rows.length) throw new Error(`No ${name} list`);
        return rows;
      }),
    );
  const industries = async () => new Map((await constituents('nifty500', urls.nifty500)).map((r) => [r.symbol, r.industry]));
  const nifty50 = async () => new Set((await constituents('nifty50', urls.nifty50)).map((r) => r.symbol));

  // ---------- Stocks ----------

  const quote = (row, industry) => ({
    symbol: row.symbol,
    name: row.name,
    close: row.close,
    change: row.prevClose ? round2(row.close - row.prevClose) : null,
    changePct: row.prevClose ? pctChange(row.close, row.prevClose) : null,
    valueCr: row.valueCr,
    industry: industry ?? null,
  });

  async function latestStocks() {
    const day = await latestDay();
    const file = await stockFile(day);
    if (!file) throw unavailable();
    return { day, file };
  }

  async function overview() {
    const day = await latestDay();
    const [indices, { file: stocks }, inNifty50, industryOf] = await Promise.all([indexFile(day), latestStocks(), nifty50(), industries()]);

    const pick = (name) => indices.get(name.toLowerCase());
    const indexJson = (r) => ({
      name: r.name, close: r.close, change: r.change, changePct: r.changePct, pe: r.pe, pb: r.pb, dividendYield: r.dividendYield,
    });
    const sectors = SECTORS.map(pick)
      .filter(Boolean)
      .map((r) => ({ name: r.name, close: r.close, changePct: r.changePct }))
      .sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0));

    const all = [...stocks.values()];
    const breadth = {
      advancers: all.filter((s) => s.prevClose && s.close > s.prevClose).length,
      decliners: all.filter((s) => s.prevClose && s.close < s.prevClose).length,
      unchanged: all.filter((s) => s.prevClose && s.close === s.prevClose).length,
      total: all.filter((s) => s.prevClose).length,
    };

    const blue = [...inNifty50].map((symbol) => stocks.get(symbol)).filter(Boolean).map((r) => quote(r, industryOf.get(r.symbol)));
    return {
      asOf: day,
      source: SOURCE,
      indices: HEADLINE.map(pick).filter(Boolean).map(indexJson),
      sectors,
      breadth,
      gainers: blue.filter((s) => s.changePct > 0).sort((a, b) => b.changePct - a.changePct).slice(0, 5),
      losers: blue.filter((s) => s.changePct < 0).sort((a, b) => a.changePct - b.changePct).slice(0, 5),
      mostActive: [...blue].sort((a, b) => b.valueCr - a.valueCr).slice(0, 5),
    };
  }

  /** Every Nifty 50 company with its latest quote, by symbol. */
  async function nifty50List() {
    const [{ day, file }, members, industryOf] = await Promise.all([latestStocks(), nifty50(), industries().catch(() => new Map())]);
    const items = [...members]
      .map((symbol) => file.get(symbol))
      .filter(Boolean)
      .map((row) => quote(row, industryOf.get(row.symbol)))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
    return { asOf: day, items };
  }

  async function searchStocks(query) {
    const q = String(query ?? '').trim().toLowerCase();
    if (!q) return [];
    const [{ file }, industryOf, members] = await Promise.all([
      latestStocks(),
      industries().catch(() => new Map()),
      nifty50().catch(() => new Set()),
    ]);
    const alias = STOCK_ALIASES[q.replace(/\s+/g, ' ')];
    const scored = [];
    for (const row of file.values()) {
      const symbol = row.symbol.toLowerCase();
      const name = row.name.toLowerCase();
      let rank = null;
      if (symbol === q || row.symbol === alias) rank = 0;
      else if (symbol.startsWith(q)) rank = 1;
      else if (name.split(/\s+/).some((word) => word.startsWith(q))) rank = 2;
      else if (symbol.includes(q)) rank = 3;
      else if (name.includes(q)) rank = 4;
      if (rank !== null) scored.push({ rank, row, big: members.has(row.symbol) });
    }
    // The best symbol match first; among equals, the Nifty 50 companies, then whatever people traded most.
    return scored
      .sort((a, b) => a.rank - b.rank || Number(b.big) - Number(a.big) || b.row.valueCr - a.row.valueCr || a.row.symbol.localeCompare(b.row.symbol))
      .slice(0, 10)
      .map(({ row }) => ({ symbol: row.symbol, name: row.name, industry: industryOf.get(row.symbol) ?? null }));
  }

  async function stockDetail(symbol) {
    const sym = String(symbol ?? '').trim().toUpperCase();
    const { day, file } = await latestStocks();
    const row = file.get(sym);
    if (!row) throw ApiError.notFound('We could not find that stock on the NSE.');

    const [industryOf, inNifty50, baselines] = await Promise.all([
      industries().catch(() => new Map()),
      nifty50().catch(() => new Set()),
      Promise.all(STOCK_PERIODS.map((p) => fileOnOrBefore(stockFile, targetDay(day, p)))),
    ]);
    const returns = periodReturns({
      latest: row.close,
      periods: STOCK_PERIODS,
      then: (p) => {
        const found = baselines[STOCK_PERIODS.indexOf(p)];
        const then = found?.file.get(sym);
        return then ? { value: then.close, from: found.day } : null;
      },
    });
    return {
      symbol: row.symbol,
      name: row.name,
      isin: row.isin,
      industry: industryOf.get(sym) ?? null,
      inNifty50: inNifty50.has(sym),
      asOf: day,
      close: row.close,
      prevClose: row.prevClose,
      change: row.prevClose ? round2(row.close - row.prevClose) : null,
      changePct: row.prevClose ? pctChange(row.close, row.prevClose) : null,
      open: row.open,
      high: row.high,
      low: row.low,
      volume: row.volume,
      valueCr: row.valueCr,
      returns,
      note: STOCK_NOTE,
    };
  }

  // ---------- Indices ----------

  async function indexDetail(name) {
    const day = await latestDay();
    const rows = await indexFile(day);
    const row = rows.get(String(name ?? '').trim().toLowerCase());
    if (!row) throw ApiError.notFound('We could not find that index.');
    const baselines = await Promise.all(INDEX_PERIODS.map((p) => fileOnOrBefore(indexFile, targetDay(day, p))));
    const returns = periodReturns({
      latest: row.close,
      periods: INDEX_PERIODS,
      then: (p) => {
        const found = baselines[INDEX_PERIODS.indexOf(p)];
        const then = found?.file.get(row.name.toLowerCase());
        return then ? { value: then.close, from: found.day } : null;
      },
    });
    return {
      name: row.name,
      asOf: day,
      close: row.close,
      change: row.change,
      changePct: row.changePct,
      open: row.open,
      high: row.high,
      low: row.low,
      pe: row.pe,
      pb: row.pb,
      dividendYield: row.dividendYield,
      returns,
      note: INDEX_NOTE,
    };
  }

  // ---------- Mutual funds ----------

  const loadFund = (code) =>
    memo(`fund:${code}`, 6 * HOUR, () =>
      download(async () => {
        const json = await fetchJson(`${MFAPI}/${code}`);
        const series = parseNavSeries(json?.data);
        if (!json?.meta || series.length < 2) return null;
        return { meta: json.meta, series };
      }),
    );

  const fundReturns = (series, periods) => {
    const last = series.at(-1);
    return periodReturns({
      latest: last.nav,
      periods,
      then: (p) => {
        const found = valueOnOrBefore(series, targetDay(last.day, p));
        return found ? { value: found.nav, from: found.day } : null;
      },
    });
  };

  const fundHead = ({ meta, series }) => {
    const last = series.at(-1);
    return {
      code: Number(meta.scheme_code),
      name: meta.scheme_name,
      house: meta.fund_house ?? null,
      category: meta.scheme_category ?? null,
      nav: last.nav,
      navDate: last.day,
    };
  };

  async function fundDetail(code) {
    const id = Number(code);
    if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest('That is not a valid scheme code');
    const fund = await loadFund(id);
    if (!fund) throw ApiError.notFound('We could not find that fund.');
    const { series, meta } = fund;
    const first = series[0];
    const last = series.at(-1);
    const years = (Date.parse(last.day) - Date.parse(first.day)) / (365.25 * 86_400_000);
    const fiveYearsAgo = shiftMonths(last.day, -60);
    return {
      ...fundHead(fund),
      type: meta.scheme_type ?? null,
      returns: fundReturns(series, INDEX_PERIODS),
      sinceLaunch: years >= 1 ? { since: first.day, years: Math.round(years * 10) / 10, pct: cagr(last.nav, first.nav, years) } : null,
      risk: { maxDrawdownPct: maxDrawdown(series), positiveYearShare: positiveWindowShare(series, 1) },
      history: downsample(series.filter((p) => p.day >= fiveYearsAgo), 130),
      note: FUND_NOTE,
    };
  }

  async function searchFunds(query) {
    const q = String(query ?? '').trim();
    if (!q) return [];
    const rows = await download(() => fetchJson(`${MFAPI}/search?q=${encodeURIComponent(q)}`));
    const list = (Array.isArray(rows) ? rows : []).map((r) => ({ code: Number(r.schemeCode), name: String(r.schemeName ?? '').trim() })).filter((r) => r.code && r.name);
    const growth = list.filter((r) => /direct/i.test(r.name) && /growth/i.test(r.name) && !/idcw|dividend|bonus/i.test(r.name));
    // A name that holds everything you typed, in order, comes before one that merely uses the same words; shorter names first.
    const phrase = q.toLowerCase().replace(/\s+/g, ' ');
    const has = (r) => r.name.toLowerCase().replace(/\s+/g, ' ').includes(phrase);
    return [...(growth.length ? growth : list)].sort((a, b) => Number(has(b)) - Number(has(a)) || a.name.length - b.name.length).slice(0, 20);
  }

  async function topFunds(categoryId) {
    const category = FUND_CATEGORIES.find((c) => c.id === categoryId);
    if (!category) throw ApiError.badRequest('Choose one of the fund categories');
    const codes = MF_UNIVERSE.filter((f) => f.category === category.id).map((f) => f.code);
    const settled = await Promise.allSettled(codes.map(loadFund));
    if (settled.every((r) => r.status === 'rejected')) throw unavailable();

    const items = settled
      .filter((r) => r.status === 'fulfilled' && r.value)
      .map((r) => ({ ...fundHead(r.value), returns: fundReturns(r.value.series, FUND_TOP_PERIODS) }))
      .sort((a, b) => {
        const get = (f, p) => f.returns.find((x) => x.period === p).pct;
        return (get(b, '3Y') ?? -Infinity) - (get(a, '3Y') ?? -Infinity) || (get(b, '1Y') ?? -Infinity) - (get(a, '1Y') ?? -Infinity);
      });
    return {
      category,
      rankedBy: '3Y',
      asOf: items.map((i) => i.navDate).sort().at(-1) ?? null,
      items,
      disclaimer:
        'Ranked by 3-year annualised return from official NAVs. This is a small sample of widely held direct plans, not the whole market, and not a recommendation. Past performance does not predict future returns.',
    };
  }

  const fundCategories = () => FUND_CATEGORIES;

  // ---------- Watchlist helper ----------

  /** Confirms something exists and gives its label and latest figures. Throws 404 if it does not. */
  async function describe(kind, ref) {
    if (kind === 'stock') {
      const { day, file } = await latestStocks();
      const row = file.get(String(ref).trim().toUpperCase());
      if (!row) throw ApiError.notFound('We could not find that stock on the NSE.');
      return { kind, ref: row.symbol, label: row.name, price: row.close, changePct: row.prevClose ? pctChange(row.close, row.prevClose) : null, asOf: day };
    }
    if (kind === 'index') {
      const day = await latestDay();
      const row = (await indexFile(day)).get(String(ref).trim().toLowerCase());
      if (!row) throw ApiError.notFound('We could not find that index.');
      return { kind, ref: row.name, label: row.name, price: row.close, changePct: row.changePct, asOf: day };
    }
    if (kind === 'fund') {
      const id = Number(ref);
      if (!Number.isInteger(id) || id <= 0) throw ApiError.notFound('We could not find that fund.');
      const fund = await loadFund(id);
      if (!fund) throw ApiError.notFound('We could not find that fund.');
      const head = fundHead(fund);
      const prev = fund.series.at(-2);
      return { kind, ref: String(head.code), label: head.name, price: head.nav, changePct: pctChange(head.nav, prev?.nav), asOf: head.navDate };
    }
    throw ApiError.badRequest('You can watch a stock, an index or a fund');
  }

  return { overview, indexDetail, nifty50: nifty50List, searchStocks, stockDetail, searchFunds, fundCategories, topFunds, fundDetail, describe };
}
