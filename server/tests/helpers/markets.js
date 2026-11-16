/**
 * Fake NSE and mutual fund data for tests. Nothing here touches the network: the market service is given
 * these fetchers, and every price is a simple function of the date so tests can work out the expected numbers.
 */
import { zipSync, strToU8 } from 'fflate';

export const LATEST = '2026-11-13'; // a Friday
export const NOW_MONDAY_MORNING = new Date('2026-11-16T00:40:00Z'); // Monday 06:10 in India: Friday's files are the newest

const DAY = 86_400_000;
const utc = (day) => Date.UTC(...day.split('-').map((v, i) => (i === 1 ? Number(v) - 1 : Number(v))));
export const dayNumber = (day) => Math.round((utc(day) - Date.UTC(2021, 0, 1)) / DAY);
export const isWeekend = (day) => [0, 6].includes(new Date(utc(day)).getUTCDay());
export const addDays = (day, n) => new Date(utc(day) + n * DAY).toISOString().slice(0, 10);
export const previousWeekday = (day) => {
  let d = addDays(day, -1);
  while (isWeekend(d)) d = addDays(d, -1);
  return d;
};

// price(day) = base + slope * days since 2021-01-01, plus a one-off jump on the latest day so movers are predictable.
export const STOCKS = [
  { symbol: 'AAA', name: 'AAA FINANCE LTD', isin: 'INE000A01001', industry: 'Financial Services', nifty50: true, base: 100, slope: 0.1, jump: 5, volume: 1_000_000 },
  { symbol: 'BBB', name: 'BBB MOTORS LTD', isin: 'INE000B01002', industry: 'Automobile and Auto Components', nifty50: true, base: 500, slope: -0.05, jump: -10, volume: 3_000_000 },
  { symbol: 'CCC', name: 'CCC FOODS LTD', isin: 'INE000C01003', industry: 'Fast Moving Consumer Goods', nifty50: true, base: 50, slope: 0, jump: 0, volume: 2_000_000 },
  { symbol: 'DDD', name: 'DDD CHEMICALS LTD', isin: 'INE000D01004', industry: 'Chemicals', nifty50: false, base: 200, slope: 0.2, jump: 1, volume: 500_000 },
];

export const INDICES = [
  { name: 'Nifty 50', base: 10000, slope: 6, pe: 20.49, pb: 3.08, dy: 1.4 },
  { name: 'Nifty Bank', base: 25000, slope: 10, pe: 13.49, pb: 1.84, dy: 1.03 },
  { name: 'Nifty IT', base: 20000, slope: 4, pe: 19.41, pb: 5.55, dy: 3.61 },
  { name: 'NIFTY Midcap 100', base: 20000, slope: 12, pe: 28.1, pb: 4.2, dy: 0.9 },
  { name: 'NIFTY Smallcap 100', base: 7000, slope: 5, pe: 25.5, pb: 3.9, dy: 0.8 },
  { name: 'India VIX', base: 15, slope: 0, pe: null, pb: null, dy: null },
  { name: 'Nifty Auto', base: 9000, slope: 3, pe: 24.2, pb: 4.1, dy: 1.1 },
  { name: 'Nifty Pharma', base: 15000, slope: -1, pe: 30.2, pb: 4.7, dy: 0.7 },
];

const linear = (item, day) => item.base + item.slope * dayNumber(day);
export const stockClose = (s, day) => Number((linear(s, day) + (day === LATEST ? s.jump : 0)).toFixed(2));
export const stockPrevClose = (s, day) => stockClose(s, previousWeekday(day));
export const indexClose = (i, day) => Number(linear(i, day).toFixed(2));

const BHAV_HEADER =
  'TradDt,BizDt,Sgmt,Src,FinInstrmTp,FinInstrmId,ISIN,TckrSymb,SctySrs,XpryDt,FininstrmActlXpryDt,StrkPric,OptnTp,FinInstrmNm,OpnPric,HghPric,LwPric,ClsPric,LastPric,PrvsClsgPric,UndrlygPric,SttlmPric,OpnIntrst,ChngInOpnIntrst,TtlTradgVol,TtlTrfVal,TtlNbOfTxsExctd,SsnId,NewBrdLotQty,Rmks,Rsvd1,Rsvd2,Rsvd3,Rsvd4';

export function bhavRow(day, { symbol, name, isin, series = 'EQ', open, high, low, close, prevClose, volume }) {
  const value = (close * volume).toFixed(2);
  return `${day},${day},CM,NSE,STK,1,${isin},${symbol},${series},,,,,${name},${open},${high},${low},${close},${close},${prevClose},,${close},,,${volume},${value},100,F1,1,,,,,`;
}

export function bhavZip(day, rows) {
  const csv = [BHAV_HEADER, ...rows.map((r) => bhavRow(day, r))].join('\n');
  return Buffer.from(zipSync({ [`BhavCopy_NSE_CM_0_0_0_${day.replaceAll('-', '')}_F_0000.csv`]: strToU8(csv) }));
}

export const stocksOn = (day) =>
  STOCKS.map((s) => {
    const close = stockClose(s, day);
    return { ...s, series: 'EQ', open: close, high: close + 1, low: close - 1, close, prevClose: stockPrevClose(s, day) };
  });

const INDEX_HEADER = 'Index Name,Index Date,Open Index Value,High Index Value,Low Index Value,Closing Index Value,Points Change,Change(%),Volume,Turnover (Rs. Cr.),P/E,P/B,Div Yield';

export function indexCsv(day) {
  const [y, m, d] = day.split('-');
  const rows = INDICES.map((i) => {
    const close = indexClose(i, day);
    const prev = indexClose(i, previousWeekday(day));
    const change = Number((close - prev).toFixed(2));
    const pct = prev ? Number(((change / prev) * 100).toFixed(2)) : 0;
    const f = (v) => (v === null ? '-' : v);
    return `${i.name},${d}-${m}-${y},${close},${close + 5},${close - 5},${close},${change},${pct},1000,500.5,${f(i.pe)},${f(i.pb)},${f(i.dy)}`;
  });
  return Buffer.from([INDEX_HEADER, ...rows].join('\n'));
}

const constituents = (list) =>
  Buffer.from(['Company Name,Industry,Symbol,Series,ISIN Code', ...list.map((s) => `"${s.name}",${s.industry},${s.symbol},EQ,${s.isin}`)].join('\n'));

/**
 * A stand-in for the downloader. `files` lists the days that have been published; a weekday not in it behaves
 * like a market holiday (404). `calls` records every URL asked for.
 */
export function fakeNse({ publishedFrom = '2021-01-01', published = new Set(), skip = new Set(), fail = false, failWith = 403 } = {}) {
  const calls = [];
  const has = (day) => !isWeekend(day) && day >= publishedFrom && !skip.has(day) && (day <= LATEST || published.has(day));
  const fetchBuffer = async (url) => {
    calls.push(url);
    if (fail) {
      const err = new Error(`NSE refused (${failWith})`);
      err.status = failWith;
      throw err;
    }
    let m = url.match(/ind_close_all_(\d{2})(\d{2})(\d{4})\.csv$/);
    if (m) {
      const day = `${m[3]}-${m[2]}-${m[1]}`;
      return has(day) ? indexCsv(day) : null;
    }
    m = url.match(/BhavCopy_NSE_CM_0_0_0_(\d{4})(\d{2})(\d{2})_F_0000\.csv\.zip$/);
    if (m) {
      const day = `${m[1]}-${m[2]}-${m[3]}`;
      return has(day) ? bhavZip(day, [...stocksOn(day), { symbol: 'XYZ', name: 'XYZ BONDS', isin: 'INE000X01009', series: 'BE', open: 10, high: 10, low: 10, close: 10, prevClose: 9, volume: 10 }]) : null;
    }
    if (url.endsWith('ind_nifty50list.csv')) return constituents(STOCKS.filter((s) => s.nifty50));
    if (url.endsWith('ind_nifty500list.csv')) return constituents(STOCKS);
    throw new Error(`Unexpected URL in test: ${url}`);
  };
  return { fetchBuffer, calls, published };
}

// ---------- Mutual funds ----------

export const FUNDS = [
  // NAV(day) = 10 * (1 + growth) ^ days since 2018-01-01; a dip in 2020 gives the funds a drawdown.
  { code: 120716, name: 'UTI Nifty 50 Index Fund - Direct Plan - Growth', house: 'UTI Mutual Fund', category: 'Other Scheme - Index Funds', growth: 0.0004, since: '2013-01-02' },
  { code: 119063, name: 'HDFC Nifty 50 Index Fund - Direct Plan - Growth Option', house: 'HDFC Mutual Fund', category: 'Other Scheme - Index Funds', growth: 0.0006, since: '2013-01-02' },
  { code: 122639, name: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth', house: 'PPFAS Mutual Fund', category: 'Equity Scheme - Flexi Cap Fund', growth: 0.0003, since: '2013-05-24' },
  { code: 999001, name: 'Young Fund - Direct Plan - Growth', house: 'Test Mutual Fund', category: 'Equity Scheme - Large Cap Fund', growth: 0.001, since: '2026-01-02' },
];

const dmy = (day) => day.split('-').reverse().join('-');
export const navOn = (fund, day) => {
  const n = dayNumber(day) - dayNumber('2018-01-01');
  const dip = day >= '2020-02-20' && day <= '2020-03-23' ? 0.7 : 1; // a sharp fall, then recovery
  return Number((10 * (1 + fund.growth) ** Math.max(n, 0) * dip).toFixed(4));
};

export function fundSeries(fund) {
  const out = [];
  for (let day = LATEST; day >= fund.since; day = addDays(day, -1)) {
    if (!isWeekend(day)) out.push({ date: dmy(day), nav: navOn(fund, day).toFixed(5) });
  }
  return out; // newest first, like the real service
}

export function fakeMf({ fail = false, missing = new Set() } = {}) {
  const calls = [];
  const fetchJson = async (url) => {
    calls.push(url);
    if (fail) throw Object.assign(new Error('mfapi down'), { status: 503 });
    const search = url.match(/\/mf\/search\?q=(.*)$/);
    if (search) {
      const q = decodeURIComponent(search[1]).toLowerCase();
      return FUNDS.filter((f) => f.name.toLowerCase().includes(q)).map((f) => ({ schemeCode: f.code, schemeName: f.name }));
    }
    const one = url.match(/\/mf\/(\d+)$/);
    if (one) {
      const fund = FUNDS.find((f) => String(f.code) === one[1]);
      if (!fund || missing.has(fund.code)) return { status: 'ERROR', data: [] };
      return {
        meta: { fund_house: fund.house, scheme_type: 'Open Ended Schemes', scheme_category: fund.category, scheme_code: fund.code, scheme_name: fund.name },
        data: fundSeries(fund),
        status: 'SUCCESS',
      };
    }
    throw new Error(`Unexpected URL in test: ${url}`);
  };
  return { fetchJson, calls };
}
