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
  if (isLoading) return <Splash />;
  // No connection is not the same as being signed out: say so, rather than sending an installed app to the sign-in page.
  if (!user && error?.status === 0) return <Offline onRetry={refetch} />;
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
