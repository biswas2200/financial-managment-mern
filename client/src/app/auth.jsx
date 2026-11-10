import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useMe } from '../api/hooks.js';
import { LogoMark } from '../components/brand/Logo.jsx';

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Loading Kosha">
      <LogoMark size={48} className="animate-pulse" />
    </div>
  );
}

/** Only signed-in users get past this point. */
export function RequireAuth() {
  const { data: user, isLoading } = useMe();
  const location = useLocation();
  if (isLoading) return <Splash />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
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
