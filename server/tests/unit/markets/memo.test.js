import { describe, it, expect, vi } from 'vitest';
import { createMemo } from '../../../src/markets/memo.js';

const clock = () => {
  const state = { t: 0 };
  return { state, now: () => new Date(state.t) };
};

describe('memo', () => {
  it('loads once per key and shares an in-flight load', async () => {
    const { now } = clock();
    const memo = createMemo(now);
    const load = vi.fn(async () => 'value');
    const [a, b] = await Promise.all([memo('k', 1000, load), memo('k', 1000, load)]);
    expect([a, b]).toEqual(['value', 'value']);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('loads again after the time to live, and never for Infinity', async () => {
    const { now, state } = clock();
    const memo = createMemo(now);
    const load = vi.fn(async () => 1);
    await memo('short', 1000, load);
    state.t = 1001;
    await memo('short', 1000, load);
    expect(load).toHaveBeenCalledTimes(2);
    const keep = vi.fn(async () => 1);
    await memo('forever', Infinity, keep);
    state.t = 1e12;
    await memo('forever', Infinity, keep);
    expect(keep).toHaveBeenCalledTimes(1);
  });

  it('does not keep a failure', async () => {
    const { now } = clock();
    const memo = createMemo(now);
    const load = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue('ok');
    await expect(memo('k', Infinity, load)).rejects.toThrow('boom');
    await Promise.resolve();
    expect(await memo('k', Infinity, load)).toBe('ok');
  });

  it('forgets the oldest entries of a group once it is over its limit, so memory stays bounded', async () => {
    const { now } = clock();
    const memo = createMemo(now, { 'day:': 3 });
    const loads = { a: vi.fn(async () => 'a'), b: vi.fn(async () => 'b'), c: vi.fn(async () => 'c'), d: vi.fn(async () => 'd') };
    for (const k of ['a', 'b', 'c', 'd']) await memo(`day:${k}`, Infinity, loads[k]);
    await memo('day:b', Infinity, loads.b);
    await memo('day:d', Infinity, loads.d);
    expect(loads.b).toHaveBeenCalledTimes(1);
    expect(loads.d).toHaveBeenCalledTimes(1);
    await memo('day:a', Infinity, loads.a); // pushed out by the fourth, so it loads again
    expect(loads.a).toHaveBeenCalledTimes(2);
  });

  it('leaves other groups alone when one fills up', async () => {
    const { now } = clock();
    const memo = createMemo(now, { 'day:': 1 });
    const other = vi.fn(async () => 'x');
    await memo('other:1', Infinity, other);
    await memo('day:a', Infinity, async () => 1);
    await memo('day:b', Infinity, async () => 2);
    await memo('other:1', Infinity, other);
    expect(other).toHaveBeenCalledTimes(1);
  });
});
