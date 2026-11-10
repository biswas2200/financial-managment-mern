/**
 * React Query hooks: the single place where components fetch or change server data.
 * Mutations invalidate every query that could show stale numbers, so the dashboard,
 * charts, budgets and lists all update together after an add/edit/delete.
 */
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from './client.js';

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
