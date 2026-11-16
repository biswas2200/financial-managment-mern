/** The real downloaders. Tests give the market service fakes instead, so nothing in a test touches the network. */

const UA = 'Mozilla/5.0 (compatible; KoshaMarkets/1.0; +education project)';
const TIMEOUT_MS = 20_000;

async function get(url, accept) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: accept }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (res.status === 404) return null; // no such file: a holiday, a weekend, or a scheme that does not exist
  if (!res.ok) throw Object.assign(new Error(`${new URL(url).host} answered ${res.status}`), { status: res.status });
  return res;
}

/** A file's bytes, or null when the server says it does not exist. Any other failure throws. */
export async function httpBuffer(url) {
  const res = await get(url, '*/*');
  return res ? Buffer.from(await res.arrayBuffer()) : null;
}

/** Parsed JSON, or null when the server says it does not exist. */
export async function httpJson(url) {
  const res = await get(url, 'application/json');
  return res ? res.json() : null;
}

/** Used when a test builds the app without fakes: it fails like an unreachable network, never reaching out. */
export const offline = async () => {
  throw Object.assign(new Error('Network access is disabled in tests'), { status: 0 });
};
