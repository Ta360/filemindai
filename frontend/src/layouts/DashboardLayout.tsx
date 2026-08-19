import { useEffect } from "react";
import { Outlet, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import FloatingYoutubePlayer from "../components/FloatingYoutubePlayer";

export default function DashboardLayout() {
  const [params, setParams] = useSearchParams();

  // Only reached once AuthGuard confirms the user is connected, so it's safe
  // to drop the post-login query param here without racing the login redirect.
  useEffect(() => {
    if (params.get("driveConnected")) {
      const next = new URLSearchParams(params);
      next.delete("driveConnected");
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <Header />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
      <FloatingYoutubePlayer />
    </div>
  );
}
