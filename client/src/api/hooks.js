/**
 * React Query hooks: the single place where components fetch or change server data.
 * Mutations invalidate every query that could show stale numbers, so the dashboard,
 * charts, budgets and lists all update together after an add/edit/delete.
 */
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from './client.js';
import { applyReaction } from '../lib/reactions.js';

export const keys = {
  me: ['auth', 'me'],
  categories: (params) => ['categories', params ?? {}],
  transactions: (query) => ['transactions', query ?? {}],
  analytics: (name, params) => ['analytics', name, params ?? {}],
  budgets: (month) => ['budgets', month],
  insights: ['assistant', 'insights'],
  assistantStatus: ['assistant', 'status'],
  assistantHistory: ['assistant', 'history'],
};

/** Everything derived from transactions. */
function useInvalidateMoney() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['transactions'] }),
      qc.invalidateQueries({ queryKey: ['analytics'] }),
      qc.invalidateQueries({ queryKey: ['budgets'] }),
      qc.invalidateQueries({ queryKey: ['categories'] }),
      qc.invalidateQueries({ queryKey: keys.insights }),
    ]);
}

// ---------- Auth ----------

export function useMe() {
  return useQuery({
    queryKey: keys.me,
    queryFn: () => api('/auth/me').then((r) => r.user),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

function useAuthMutation(path) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api(path, { method: 'POST', body }).then((r) => r.user),
    onSuccess: (user) => {
      qc.clear();
      qc.setQueryData(keys.me, user);
    },
  });
}
export const useLogin = () => useAuthMutation('/auth/login');
export const useRegister = () => useAuthMutation('/auth/register');

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api('/auth/logout', { method: 'POST' }),
    onSettled: () => {
      qc.clear();
      qc.setQueryData(keys.me, null);
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api('/auth/me', { method: 'PATCH', body }).then((r) => r.user),
    onSuccess: (user) => qc.setQueryData(keys.me, user),
  });
}

/** Keeps the answer to the cookie banner with the account. The server returns the answer on record, which may be newer. */
export function useSaveCookieChoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api('/auth/me/cookies', { method: 'PUT', body }).then((r) => r.cookieConsent),
    onSuccess: (cookieConsent) => qc.setQueryData(keys.me, (me) => (me ? { ...me, cookieConsent } : me)),
  });
}

/** Deletes the account for good; the session is gone afterwards, so the app returns to sign-in. */
export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api('/auth/me', { method: 'DELETE', body }),
    onSuccess: () => {
      qc.clear();
      qc.setQueryData(keys.me, null);
    },
  });
}

export const useChangePassword = () =>
  useMutation({ mutationFn: (body) => api('/auth/change-password', { method: 'POST', body }) });

// ---------- Categories ----------

export function useCategories(params) {
  return useQuery({
    queryKey: keys.categories(params),
    queryFn: () => api('/categories', { query: params }),
    staleTime: 60 * 1000,
  });
}

export function useSaveCategory() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: ({ id, ...body }) =>
      id ? api(`/categories/${id}`, { method: 'PATCH', body }) : api('/categories', { method: 'POST', body }),
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidateMoney();
  return useMutation({ mutationFn: (id) => api(`/categories/${id}`, { method: 'DELETE' }), onSuccess: invalidate });
}

// ---------- Transactions ----------

export function useTransactions(query) {
  return useQuery({
    queryKey: keys.transactions(query),
    queryFn: ({ signal }) => api('/transactions', { query, signal }),
    placeholderData: keepPreviousData, // keep the old page visible while the next loads
  });
}

export function useSaveTransaction() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: ({ id, ...body }) =>
      id ? api(`/transactions/${id}`, { method: 'PATCH', body }) : api('/transactions', { method: 'POST', body }),
    onSuccess: invalidate,
  });
}

/** Optimistic delete: the row disappears immediately and comes back if the API refuses. */
export function useDeleteTransaction() {
  const qc = useQueryClient();
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: (txn) => api(`/transactions/${txn.id}`, { method: 'DELETE' }),
    onMutate: async (txn) => {
      await qc.cancelQueries({ queryKey: ['transactions'] });
      const snapshots = qc.getQueriesData({ queryKey: ['transactions'] });
      for (const [key, data] of snapshots) {
        if (!data?.items) continue;
        qc.setQueryData(key, { ...data, items: data.items.filter((t) => t.id !== txn.id), total: data.total - 1 });
      }
      return { snapshots };
    },
    onError: (_err, _txn, ctx) => {
      for (const [key, data] of ctx?.snapshots ?? []) qc.setQueryData(key, data);
    },
    onSettled: invalidate,
  });
}

// ---------- Analytics ----------

function useAnalytics(name, params, options = {}) {
  return useQuery({
    queryKey: keys.analytics(name, params),
    queryFn: ({ signal }) => api(`/analytics/${name}`, { query: params, signal }),
    placeholderData: keepPreviousData,
    ...options,
  });
}
export const useSummary = (params) => useAnalytics('summary', params);
export const useByCategory = (params) => useAnalytics('by-category', params);
export const useTrend = (params) => useAnalytics('trend', params);
export const useDaily = (params) => useAnalytics('daily', params);
export const useWeekday = (params) => useAnalytics('weekday', params);
export const useMerchants = (params) => useAnalytics('merchants', params);
export const useCategoryTrend = (params) => useAnalytics('category-trend', params);

// ---------- Budgets ----------

export function useBudgets(month) {
  return useQuery({
    queryKey: keys.budgets(month),
    queryFn: () => api('/budgets', { query: { month } }),
    placeholderData: keepPreviousData,
  });
}

export function useSaveBudget() {
  const invalidate = useInvalidateMoney();
  return useMutation({ mutationFn: (body) => api('/budgets', { method: 'PUT', body }), onSuccess: invalidate });
}

export function useDeleteBudget() {
  const invalidate = useInvalidateMoney();
  return useMutation({ mutationFn: (id) => api(`/budgets/${id}`, { method: 'DELETE' }), onSuccess: invalidate });
}

export function useCopyBudgets() {
  const invalidate = useInvalidateMoney();
  return useMutation({ mutationFn: (body) => api('/budgets/copy', { method: 'POST', body }), onSuccess: invalidate });
}

// ---------- Balance ----------

/** Tell Kosha what the user really has; every figure that includes the balance refreshes. */
export function useSetBalance() {
  const invalidate = useInvalidateMoney();
  return useMutation({ mutationFn: (body) => api('/balance', { method: 'PUT', body }), onSuccess: invalidate });
}

export const useDemoBanks = () =>
  useQuery({ queryKey: ['balance', 'banks'], queryFn: () => api('/balance/banks'), staleTime: Infinity });

/** Sample figure for a demo bank. Nothing is saved until the user chooses to use it. */
export const useFetchDemoBank = () =>
  useMutation({ mutationFn: (bank) => api('/balance/bank-demo', { method: 'POST', body: { bank } }) });

// ---------- Copilot ----------

export const useInsights = () =>
  useQuery({ queryKey: keys.insights, queryFn: () => api('/assistant/insights'), staleTime: 60 * 1000 });

export const useAssistantStatus = () =>
  useQuery({ queryKey: keys.assistantStatus, queryFn: () => api('/assistant/status'), staleTime: 30 * 1000 });

export const useAssistantHistory = () =>
  useQuery({ queryKey: keys.assistantHistory, queryFn: () => api('/assistant/history') });

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text) => api('/assistant/message', { method: 'POST', body: { text } }),
    onMutate: async (text) => {
      await qc.cancelQueries({ queryKey: keys.assistantHistory });
      const tempId = `temp-${Date.now()}`;
      qc.setQueryData(keys.assistantHistory, (old = []) => [
        ...old,
        { id: tempId, role: 'user', content: text, createdAt: new Date().toISOString(), pending: true },
      ]);
      return { tempId };
    },
    onSuccess: ({ userMessage, message }, _text, ctx) => {
      qc.setQueryData(keys.assistantHistory, (old = []) => [
        ...old.filter((m) => m.id !== ctx.tempId),
        userMessage,
        message,
      ]);
      qc.invalidateQueries({ queryKey: keys.assistantStatus });
    },
    onError: (_err, _text, ctx) => {
      qc.setQueryData(keys.assistantHistory, (old = []) =>
        old.map((m) => (m.id === ctx?.tempId ? { ...m, pending: false, failed: true } : m)),
      );
    },
  });
}

function useResolveAction(verb) {
  const qc = useQueryClient();
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: (messageId) => api(`/assistant/actions/${messageId}/${verb}`, { method: 'POST' }),
    onSuccess: ({ message }) => {
      qc.setQueryData(keys.assistantHistory, (old = []) => old.map((m) => (m.id === message.id ? message : m)));
      if (verb === 'confirm') invalidate();
    },
  });
}
export const useConfirmAction = () => useResolveAction('confirm');
export const useCancelAction = () => useResolveAction('cancel');

export function useClearHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api('/assistant/history', { method: 'DELETE' }),
    onSuccess: () => qc.setQueryData(keys.assistantHistory, []),
  });
}

// ---------- Learn and community ----------

const FIVE_MINUTES = 5 * 60 * 1000;

export const useArticles = (domain) =>
  useQuery({ queryKey: ['learn', 'articles', domain ?? 'all'], queryFn: () => api('/learn/articles', { query: { domain } }), staleTime: FIVE_MINUTES });

export const useArticle = (slug) =>
  useQuery({ queryKey: ['learn', 'article', slug], queryFn: () => api(`/learn/articles/${slug}`), enabled: Boolean(slug), staleTime: 60 * 1000, retry: false });

export const usePosts = ({ space, sort = 'new' } = {}) =>
  useInfiniteQuery({
    queryKey: ['community', 'posts', { space: space ?? 'all', sort }],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api('/community/posts', { query: { space, sort, page: pageParam, limit: 10 } }),
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
  });

export const usePost = (id) =>
  useQuery({ queryKey: ['community', 'post', id], queryFn: () => api(`/community/posts/${id}`), enabled: Boolean(id), retry: false });

export const useComments = ({ kind, target, sort = 'top' }) =>
  useInfiniteQuery({
    queryKey: ['community', 'comments', kind, target, sort],
    initialPageParam: 1,
    enabled: Boolean(kind && target),
    queryFn: ({ pageParam }) => api('/community/comments', { query: { kind, target, sort, page: pageParam, limit: 20 } }),
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
  });

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api('/community/posts', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community', 'posts'] }),
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api(`/community/posts/${id}`, { method: 'DELETE' }),
    onSuccess: (_r, id) => {
      qc.removeQueries({ queryKey: ['community', 'post', id] });
      qc.invalidateQueries({ queryKey: ['community', 'posts'] });
    },
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api('/community/comments', { method: 'POST', body }),
    onSuccess: (_r, { kind, target }) => {
      qc.invalidateQueries({ queryKey: ['community', 'comments', kind, target] });
      // The comment count on the article or post changes too.
      qc.invalidateQueries({ queryKey: kind === 'article' ? ['learn'] : ['community', 'post'] });
      if (kind === 'post') qc.invalidateQueries({ queryKey: ['community', 'posts'] });
    },
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => api(`/community/comments/${id}`, { method: 'DELETE' }),
    onSuccess: (_r, { kind, target }) => {
      qc.invalidateQueries({ queryKey: ['community', 'comments', kind, target] });
      qc.invalidateQueries({ queryKey: kind === 'article' ? ['learn'] : ['community', 'post'] });
      if (kind === 'post') qc.invalidateQueries({ queryKey: ['community', 'posts'] });
    },
  });
}

/** Applies `change` to every cached copy of one article, post or comment: lists, detail pages and comment threads. */
function patchCached(qc, kind, target, change) {
  const hit = (x) => (kind === 'article' ? x?.slug === target : x?.id === target);
  const walk = (data) => {
    if (!data) return data;
    if (Array.isArray(data)) return data.map((x) => (hit(x) ? change(x) : x));
    if (Array.isArray(data.pages)) return { ...data, pages: data.pages.map(walk) };
    if (Array.isArray(data.items)) return { ...data, items: data.items.map((x) => (hit(x) ? change(x) : x)) };
    return hit(data) ? change(data) : data;
  };
  const roots = { article: [['learn']], post: [['community', 'posts'], ['community', 'post']], comment: [['community', 'comments']] }[kind];
  for (const queryKey of roots) qc.setQueriesData({ queryKey }, walk);
}

/**
 * Like or dislike. The screen updates at once from the same rule the server uses, then takes the server's
 * counts when they arrive (or refetches if the request failed).
 */
export function useReact() {
  const qc = useQueryClient();
  return useMutation({
    scope: { id: 'reactions' }, // clicks are sent one after another, in order, so the last click is the one that stays
    mutationFn: ({ kind, target, value }) => api('/community/reactions', { method: 'PUT', body: { kind, target, value } }),
    onMutate: ({ kind, target, value }) => patchCached(qc, kind, target, (item) => ({ ...item, ...applyReaction(item, value) })),
    onSuccess: (result, { kind, target }) => patchCached(qc, kind, target, (item) => ({ ...item, ...result })),
    onError: (_e, { kind }) =>
      qc.invalidateQueries({ queryKey: kind === 'article' ? ['learn'] : ['community'] }),
  });
}

// ---------- Markets ----------

const marketQuery = (key, path, { query, ...options } = {}) => ({
  networkMode: 'offlineFirst', // try anyway when the browser says it is offline: the service worker may hold a copy
  queryKey: ['markets', ...key],
  queryFn: () => api(`/markets${path}`, { query }),
  staleTime: 10 * 60 * 1000, // the data is end-of-day
  retry: false,
  ...options,
});

export const useMarketOverview = () => useQuery(marketQuery(['overview'], '/overview'));
export const useNifty50 = () => useQuery(marketQuery(['nifty50'], '/stocks/nifty50'));
export const useIndexDetail = (name) => useQuery(marketQuery(['index', name], `/indices/${encodeURIComponent(name ?? '')}`, { enabled: Boolean(name) }));
export const useStock = (symbol) => useQuery(marketQuery(['stock', symbol], `/stocks/${encodeURIComponent(symbol ?? '')}`, { enabled: Boolean(symbol) }));
export const useStockSearch = (q) => {
  const text = (q ?? '').trim();
  return useQuery(marketQuery(['stock-search', text], '/stocks/search', { query: { q: text }, enabled: text.length >= 2, placeholderData: keepPreviousData }));
};
export const useFundCategories = () => useQuery(marketQuery(['fund-categories'], '/funds/categories', { staleTime: Infinity }));
export const useTopFunds = (category) => useQuery(marketQuery(['funds-top', category], '/funds/top', { query: { category }, enabled: Boolean(category), staleTime: 60 * 60 * 1000 }));
export const useFund = (code) => useQuery(marketQuery(['fund', code], `/funds/${encodeURIComponent(code ?? '')}`, { enabled: Boolean(code), staleTime: 60 * 60 * 1000 }));
export const useFundSearch = (q) => {
  const text = (q ?? '').trim();
  return useQuery(marketQuery(['fund-search', text], '/funds/search', { query: { q: text }, enabled: text.length >= 2, placeholderData: keepPreviousData }));
};

export const useWatchlist = () => useQuery({ queryKey: ['watchlist'], queryFn: () => api('/watchlist'), staleTime: 60 * 1000 });

export function useAddWatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api('/watchlist', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlist'] }),
  });
}

export function useRemoveWatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api(`/watchlist/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlist'] }),
  });
}
