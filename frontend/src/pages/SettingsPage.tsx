import { useTheme } from "../hooks/useTheme";
import { useDashboard } from "../hooks/useDashboardStore";
import { authApi } from "../services/api";
import { Moon, Sun, LogOut } from "lucide-react";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { connection, refreshConnection } = useDashboard();

  async function disconnect() {
    await authApi.logout();
    await refreshConnection();
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Settings</h1>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Appearance</h2>
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600 dark:text-slate-300">Theme</p>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Google Drive Connection</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {connection.connected ? `Connected as ${connection.email}` : "Not connected"}
            </p>
            <p className="text-xs text-slate-400">Only read-only Drive access is requested.</p>
          </div>
          {connection.connected ? (
            <button
              onClick={disconnect}
              className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
            >
              <LogOut className="h-4 w-4" /> Disconnect
            </button>
          ) : (
            <a href={authApi.connectUrl()} className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">
              Connect Google Drive
            </a>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">About</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Google Drive LLM AI Assistant — search and open your Drive with natural language, get live web search
          answers, and view analytics generated from real Drive data.
        </p>
      </section>
    </div>
  );
}
