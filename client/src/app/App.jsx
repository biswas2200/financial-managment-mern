import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query';
import { ThemeProvider } from './theme.jsx';
import { RequireAuth, GuestOnly } from './auth.jsx';
import { keys } from '../api/hooks.js';
import { ToastProvider } from '../components/ui/toast.jsx';
import { AppShell } from '../components/layout/AppShell.jsx';
import { Skeleton } from '../components/ui/primitives.jsx';
import { LoginPage, RegisterPage } from '../features/auth/AuthPages.jsx';
import DashboardPage from '../features/dashboard/DashboardPage.jsx';

const TransactionsPage = lazy(() => import('../features/transactions/TransactionsPage.jsx'));
const AnalyticsPage = lazy(() => import('../features/analytics/AnalyticsPage.jsx'));
const BudgetsPage = lazy(() => import('../features/budgets/BudgetsPage.jsx'));
const AssistantPage = lazy(() => import('../features/assistant/AssistantPage.jsx'));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage.jsx'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
      retry: (count, err) => err?.status >= 500 && count < 2,
    },
  },
  queryCache: new QueryCache({
    // An expired session anywhere sends the user back to sign in.
    onError: (err, query) => {
      if (err?.status === 401 && query.queryKey[0] !== 'auth') queryClient.setQueryData(keys.me, null);
    },
  }),
});

const page = (Component) => (
  <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
    <Component />
  </Suspense>
);

function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <p className="font-wide text-2xl font-semibold">This page doesn&apos;t exist</p>
      <Link to="/" className="font-semibold text-brand hover:underline">
        Go to your overview
      </Link>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <GuestOnly />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'transactions', element: page(TransactionsPage) },
          { path: 'analytics', element: page(AnalyticsPage) },
          { path: 'budgets', element: page(BudgetsPage) },
          { path: 'copilot', element: page(AssistantPage) },
          { path: 'settings', element: page(SettingsPage) },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
]);

export function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
