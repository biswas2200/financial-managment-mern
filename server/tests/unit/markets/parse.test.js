import { describe, it, expect } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { parseCsv, parseIndexCsv, parseBhavcopy, parseConstituents, parseMfDate, parseNavSeries } from '../../../src/markets/parse.js';
import { bhavZip, bhavRow } from '../../helpers/markets.js';

describe('parseCsv', () => {
  it('splits rows and fields, and keeps commas inside quotes', () => {
    expect(parseCsv('a,b\n"Tata Consultancy, Ltd.",IT\r\nc,d\n')).toEqual([['a', 'b'], ['Tata Consultancy, Ltd.', 'IT'], ['c', 'd']]);
  });

  it('handles escaped quotes and skips blank lines', () => {
    expect(parseCsv('x,"say ""hi"""\n\n,\n')).toEqual([['x', 'say "hi"']]);
  });
});

describe('parseIndexCsv', () => {
  const csv = [
    'Index Name,Index Date,Open Index Value,High Index Value,Low Index Value,Closing Index Value,Points Change,Change(%),Volume,Turnover (Rs. Cr.),P/E,P/B,Div Yield',
    'Nifty 50,13-11-2026,25209.85,25246.35,25054.4,25144.3,-155.05,-.61,239573267,25397.2,20.49,3.08,1.4',
    'India VIX,13-11-2026,12.1,12.9,11.8,12.5,0.4,3.3,-,-,-,-,-',
  ].join('\n');

  it('reads prices, change and valuation as numbers', () => {
    const [nifty] = parseIndexCsv(csv);
    expect(nifty).toEqual({
      name: 'Nifty 50', date: '2026-11-13', open: 25209.85, high: 25246.35, low: 25054.4, close: 25144.3,
      change: -155.05, changePct: -0.61, volume: 239573267, turnoverCr: 25397.2, pe: 20.49, pb: 3.08, dividendYield: 1.4,
    });
  });

  it('turns "-" into null instead of NaN', () => {
    const vix = parseIndexCsv(csv)[1];
    expect(vix.pe).toBeNull();
    expect(vix.volume).toBeNull();
    expect(vix.close).toBe(12.5);
  });

  it('ignores a file that is not an index list', () => {
    expect(parseIndexCsv('<html>Access Denied</html>')).toEqual([]);
  });
});

describe('parseBhavcopy', () => {
  const row = { symbol: 'TCS', name: 'TATA CONSULTANCY SERVICES LTD', isin: 'INE467B01029', open: 3000, high: 3050, low: 2980, close: 3020.5, prevClose: 3000, volume: 1_200_000 };

  it('reads equity rows from the zip into a map by symbol', () => {
    const map = parseBhavcopy(bhavZip('2026-11-13', [row]));
    expect(map.get('TCS')).toEqual({
      symbol: 'TCS', name: 'TATA CONSULTANCY SERVICES LTD', isin: 'INE467B01029',
      open: 3000, high: 3050, low: 2980, close: 3020.5, prevClose: 3000, volume: 1_200_000,
      valueCr: Number(((3020.5 * 1_200_000) / 1e7).toFixed(2)),
    });
  });

  it('keeps only the main equity series (EQ), not bonds, ETFs or other series', () => {
    const map = parseBhavcopy(bhavZip('2026-11-13', [row, { ...row, symbol: 'GOLDBOND', series: 'GB' }, { ...row, symbol: 'SMEX', series: 'SM' }]));
    expect([...map.keys()]).toEqual(['TCS']);
  });

  it('skips rows with no usable close', () => {
    const csv = ['TradDt,TckrSymb,SctySrs,FinInstrmNm,ISIN,OpnPric,HghPric,LwPric,ClsPric,PrvsClsgPric,TtlTradgVol,TtlTrfVal', '2026-11-13,BAD,EQ,BAD LTD,INE1,0,0,0,,0,0,0'].join('\n');
    expect(parseBhavcopy(Buffer.from(zipSync({ 'x.csv': strToU8(csv) }))).size).toBe(0);
  });

  it('reads a plain csv buffer too', () => {
    const csv = ['TradDt,TckrSymb,SctySrs,FinInstrmNm,ISIN,OpnPric,HghPric,LwPric,ClsPric,PrvsClsgPric,TtlTradgVol,TtlTrfVal', '2026-11-13,INFY,EQ,INFOSYS LTD,INE009A01021,1500,1520,1490,1510,1495,100,15100000'].join('\n');
    expect(parseBhavcopy(Buffer.from(csv)).get('INFY').close).toBe(1510);
  });

  it('throws on something that is neither a zip nor a bhavcopy', () => {
    expect(() => parseBhavcopy(Buffer.from('<html>Access Denied</html>'))).toThrow(/bhavcopy/i);
  });

  it('builds rows the way the exchange does', () => {
    expect(bhavRow('2026-11-13', { ...row, series: 'EQ' }).split(',')[7]).toBe('TCS');
  });
});

describe('parseConstituents', () => {
  it('reads company, industry, symbol and ISIN', () => {
    const csv = 'Company Name,Industry,Symbol,Series,ISIN Code\n"Adani Ports and Special Economic Zone Ltd.",Services,ADANIPORTS,EQ,INE742F01042\nABB India Ltd.,Capital Goods,ABB,EQ,INE117A01022';
    expect(parseConstituents(csv)).toEqual([
      { name: 'Adani Ports and Special Economic Zone Ltd.', industry: 'Services', symbol: 'ADANIPORTS', isin: 'INE742F01042' },
      { name: 'ABB India Ltd.', industry: 'Capital Goods', symbol: 'ABB', isin: 'INE117A01022' },
    ]);
  });
});

describe('mutual fund NAV data', () => {
  it('turns DD-MM-YYYY into a day key', () => {
    expect(parseMfDate('13-11-2026')).toBe('2026-11-13');
    expect(parseMfDate('2026-11-13')).toBeNull();
    expect(parseMfDate('31-02-2026')).toBeNull();
  });

  it('sorts a NAV series oldest first and drops bad rows', () => {
    const rows = [
      { date: '03-01-2020', nav: '12.5' },
      { date: '02-01-2020', nav: '12.0' },
      { date: '04-01-2020', nav: 'N.A.' },
      { date: 'bad', nav: '13' },
      { date: '06-01-2020', nav: '0' },
    ];
    expect(parseNavSeries(rows)).toEqual([
      { day: '2020-01-02', nav: 12 },
      { day: '2020-01-03', nav: 12.5 },
    ]);
  });
});
