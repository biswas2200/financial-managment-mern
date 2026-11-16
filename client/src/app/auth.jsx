import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useMe } from '../api/hooks.js';
import { LogoMark } from '../components/brand/Logo.jsx';
import { Button } from '../components/ui/primitives.jsx';

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Loading Kosha">
      <LogoMark size={48} className="animate-pulse" />
    </div>
  );
}

const SIGNED_IN_KEY = 'kosha-signed-in';
/** This browser has signed in before. Only a hint for what to show with no connection; the server still decides who you are. */
const remembered = (value) => {
  try {
    if (value === undefined) return localStorage.getItem(SIGNED_IN_KEY) === '1';
    if (value) localStorage.setItem(SIGNED_IN_KEY, '1');
    else localStorage.removeItem(SIGNED_IN_KEY);
  } catch {
    /* private mode or blocked storage: the hint is optional */
  }
  return false;
};

function Offline({ onRetry }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <LogoMark size={44} />
      <h1 className="font-wide text-2xl font-semibold">You&apos;re offline</h1>
      <p className="max-w-sm text-ink-2">Kosha can&apos;t reach the server, so it can&apos;t check your sign-in yet. Reconnect and try again.</p>
      <Button onClick={() => onRetry?.()}>Try again</Button>
    </div>
  );
}

/**
 * Only signed-in users get past this point. A visitor at the front door ("/") sees the `landing` page instead,
 * if there is one; anywhere else they are sent to sign in.
 */
export function RequireAuth({ landing }) {
  const { data: user, isLoading, error, refetch } = useMe();
  const location = useLocation();
  useEffect(() => {
    if (user) remembered(true);
    else if (user === null || error?.status === 401) remembered(false);
  }, [user, error]);
  if (isLoading) return <Splash />;
  // No connection is not the same as being signed out: for someone who has signed in here before, say so rather than
  // sending an installed app to the sign-in page. A first-time visitor has nothing to check, so they see the landing page.
  if (!user && error?.status === 0 && remembered()) return <Offline onRetry={refetch} />;
  if (!user) {
    if (landing && location.pathname === '/') return landing;
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

/** Login/register pages bounce signed-in users to the app. */
export function GuestOnly() {
  const { data: user, isLoading } = useMe();
  if (isLoading) return <Splash />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}

export function useCurrentUser() {
  return useMe().data;
}
