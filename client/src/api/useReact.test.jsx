import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReact } from './hooks.js';

const calls = [];
const releases = [];
vi.mock('./client.js', () => ({
  api: vi.fn((path, opts) => {
    calls.push(opts.body.value);
    return new Promise((resolve) => releases.push(() => resolve({ likes: 1, dislikes: 0, myReaction: opts.body.value })));
  }),
}));

const wrapper = ({ children }) => <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;

describe('useReact', () => {
  beforeEach(() => {
    calls.length = 0;
    releases.length = 0;
  });

  it('sends one reaction at a time, in the order they were clicked, so the last click is the one that stays', async () => {
    const { result } = renderHook(() => useReact(), { wrapper });
    act(() => {
      result.current.mutate({ kind: 'post', target: 'a'.repeat(24), value: 'like' });
      result.current.mutate({ kind: 'post', target: 'a'.repeat(24), value: 'dislike' });
      result.current.mutate({ kind: 'post', target: 'a'.repeat(24), value: null });
    });
    await waitFor(() => expect(calls).toEqual(['like']));
    await act(async () => releases.shift()());
    await waitFor(() => expect(calls).toEqual(['like', 'dislike']));
    await act(async () => releases.shift()());
    await waitFor(() => expect(calls).toEqual(['like', 'dislike', null]));
  });
});
