/** Turns the exchange's and the fund data source's files into plain objects. Nothing here touches the network. */
import { unzipSync, strFromU8 } from 'fflate';

/** Minimal CSV reader: quoted fields, escaped quotes, blank lines skipped. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    if (row.some((cell) => cell.trim() !== '')) rows.push(row.map((cell) => cell.trim()));
    row = [];
  };
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') endField();
    else if (ch === '\n') endRow();
    else if (ch !== '\r') field += ch;
  }
  if (field !== '' || row.length) endRow();
  return rows;
}

const num = (value) => {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (s === '' || s === '-') return null;
  const n = Number(s.replaceAll(',', ''));
  return Number.isFinite(n) ? n : null;
};

const round2 = (n) => Math.round(n * 100) / 100;

/** "13-11-2026" → "2026-11-13", or null if it is not a real date. */
export function parseMfDate(value) {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(String(value ?? '').trim());
  if (!m) return null;
  const [, d, mo, y] = m;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  if (date.getUTCFullYear() !== Number(y) || date.getUTCMonth() !== Number(mo) - 1 || date.getUTCDate() !== Number(d)) return null;
  return `${y}-${mo}-${d}`;
}

function table(rows, required) {
  const header = rows[0]?.map((h) => h.toLowerCase());
  if (!header || !required.every((name) => header.includes(name.toLowerCase()))) return null;
  const col = (name) => header.indexOf(name.toLowerCase());
  return { body: rows.slice(1), col };
}

/** NSE "all indices" end-of-day file. */
export function parseIndexCsv(text) {
  const t = table(parseCsv(text), ['Index Name', 'Closing Index Value']);
  if (!t) return [];
  const { col } = t;
  return t.body
    .map((r) => ({
      name: r[col('Index Name')],
      date: parseMfDate(r[col('Index Date')]),
      open: num(r[col('Open Index Value')]),
      high: num(r[col('High Index Value')]),
      low: num(r[col('Low Index Value')]),
      close: num(r[col('Closing Index Value')]),
      change: num(r[col('Points Change')]),
      changePct: num(r[col('Change(%)')]),
      volume: num(r[col('Volume')]),
      turnoverCr: num(r[col('Turnover (Rs. Cr.)')]),
      pe: num(r[col('P/E')]),
      pb: num(r[col('P/B')]),
      dividendYield: num(r[col('Div Yield')]),
    }))
    .filter((r) => r.name && r.close !== null);
}

/** NSE end-of-day "bhavcopy" (zip or plain csv) → Map of symbol → prices, main equity series only. */
export function parseBhavcopy(buffer) {
  let text;
  try {
    const isZip = buffer.length > 3 && buffer[0] === 0x50 && buffer[1] === 0x4b;
    text = isZip ? strFromU8(Object.values(unzipSync(new Uint8Array(buffer)))[0]) : buffer.toString('utf8');
  } catch {
    throw new Error('Not a valid bhavcopy file');
  }
  const t = table(parseCsv(text), ['TckrSymb', 'SctySrs', 'ClsPric']);
  if (!t) throw new Error('Not a valid bhavcopy file');
  const { col } = t;
  const out = new Map();
  for (const r of t.body) {
    if (r[col('SctySrs')] !== 'EQ') continue;
    const close = num(r[col('ClsPric')]);
    if (!close || close <= 0) continue;
    const orClose = (v) => (v && v > 0 ? v : close);
    const symbol = r[col('TckrSymb')];
    out.set(symbol, {
      symbol,
      name: r[col('FinInstrmNm')] ?? symbol,
      isin: r[col('ISIN')] ?? null,
      open: orClose(num(r[col('OpnPric')])),
      high: orClose(num(r[col('HghPric')])),
      low: orClose(num(r[col('LwPric')])),
      close,
      prevClose: num(r[col('PrvsClsgPric')]) || null,
      volume: num(r[col('TtlTradgVol')]) ?? 0,
      valueCr: round2((num(r[col('TtlTrfVal')]) ?? 0) / 1e7),
    });
  }
  return out;
}

/** NSE index constituent list (Nifty 50, Nifty 500). */
export function parseConstituents(text) {
  const t = table(parseCsv(text), ['Company Name', 'Symbol']);
  if (!t) return [];
  const { col } = t;
  return t.body.map((r) => ({
    name: r[col('Company Name')],
    industry: r[col('Industry')] ?? null,
    symbol: r[col('Symbol')],
    isin: r[col('ISIN Code')] ?? null,
  }));
}

/** mfapi rows [{ date: 'DD-MM-YYYY', nav: '12.3' }] → [{ day, nav }] oldest first. */
export function parseNavSeries(rows) {
  const byDay = new Map();
  for (const r of rows ?? []) {
    const day = parseMfDate(r?.date);
    const nav = Number(r?.nav);
    if (day && Number.isFinite(nav) && nav > 0) byDay.set(day, nav);
  }
  return [...byDay].map(([day, nav]) => ({ day, nav })).sort((a, b) => (a.day < b.day ? -1 : 1));
}
