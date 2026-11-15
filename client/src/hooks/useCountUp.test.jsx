import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountUp } from './useCountUp.js';

function mockReducedMotion(reduce) {
  window.matchMedia = vi.fn().mockImplementation((q) => ({
    matches: reduce && q.includes('reduce'),
    media: q,
    addEventListener() {},
    removeEventListener() {},
  }));
}

afterEach(() => {
  vi.useRealTimers();
});

describe('useCountUp', () => {
  it('shows the final number straight away when the user prefers reduced motion', () => {
    mockReducedMotion(true);
    const { result } = renderHook(() => useCountUp(48400, { duration: 800 }));
    expect(result.current).toBe(48400);
  });

  it('counts from zero up to the target over the duration', () => {
    mockReducedMotion(false);
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const { result } = renderHook(() => useCountUp(1000, { duration: 600 }));
    expect(result.current).toBe(0);
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(1000);
    act(() => vi.advanceTimersByTime(400));
    expect(result.current).toBe(1000);
  });

  it('animates from the previous value when the target changes', () => {
    mockReducedMotion(false);
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const { result, rerender } = renderHook(({ v }) => useCountUp(v, { duration: 400 }), { initialProps: { v: 500 } });
    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toBe(500);
    rerender({ v: 900 });
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBeGreaterThanOrEqual(500);
    expect(result.current).toBeLessThan(900);
    act(() => vi.advanceTimersByTime(400));
    expect(result.current).toBe(900);
  });
});
