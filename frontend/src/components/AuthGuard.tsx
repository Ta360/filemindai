import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useDashboard } from "../hooks/useDashboardStore";

/** Gates the dashboard behind sign-in: redirects to /login until auth status is known and connected. */
export default function AuthGuard() {
  const { connection, authChecked } = useDashboard();
  const location = useLocation();

  if (!authChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!connection.connected) {
    return <Navigate to={`/login${location.search}`} replace />;
  }

  return <Outlet />;
}
