import { useAuth } from '@/hooks/use-auth';
import { Spinner } from '@/components/ui/spinner';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/** Full-page loading state used while the session is being restored. */
export function SessionLoadingScreen() {
  return (
    <div className="flex min-h-[50svh] items-center justify-center">
      <Spinner className="h-6 w-6" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

/** Requires a signed-in user; remembers where they were headed. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) return <SessionLoadingScreen />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children}</>;
}

/** Requires an admin role. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAdmin, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) return <SessionLoadingScreen />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
