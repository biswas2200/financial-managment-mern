/**
 * A small cache keyed by string, shared by everything the market service downloads.
 *  - One load per key; callers that arrive while it is loading share it.
 *  - A time to live, or a function that decides it from the loaded value (a missing file is worth keeping for less
 *    time than a file that exists).
 *  - A failed load is never kept.
 *  - `caps` limits how many entries a group of keys (by prefix) may hold, dropping the least recently used, so a
 *    server that runs for months does not fill up with old trading days.
 */
export function createMemo(now, caps = {}) {
  const store = new Map();
  const prefixes = Object.keys(caps);

  function trim(key) {
    const prefix = prefixes.find((p) => key.startsWith(p));
    if (!prefix) return;
    const keys = [...store.keys()].filter((k) => k.startsWith(prefix));
    while (keys.length > caps[prefix]) store.delete(keys.shift());
  }

  return (key, ttl, load) => {
    const t = now().getTime();
    const hit = store.get(key);
    if (hit && hit.expires > t) {
      store.delete(key); // most recently used goes to the back
      store.set(key, hit);
      return hit.promise;
    }
    const entry = { promise: null, expires: typeof ttl === 'function' ? t + 60_000 : ttl === Infinity ? Infinity : t + ttl };
    entry.promise = load();
    store.set(key, entry);
    trim(key);
    entry.promise.then(
      (value) => {
        if (typeof ttl === 'function') entry.expires = now().getTime() + ttl(value);
      },
      () => {
        if (store.get(key) === entry) store.delete(key);
      },
    );
    return entry.promise;
  };
}
