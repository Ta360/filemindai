import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sun, Moon, Settings, LogOut, CloudOff, CheckCircle2, ChevronDown } from "lucide-react";
import { useDashboard } from "../hooks/useDashboardStore";
import { useTheme } from "../hooks/useTheme";
import { authApi } from "../services/api";

export default function Header() {
  const { connection, refreshConnection } = useDashboard();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await authApi.logout();
    await refreshConnection();
    setMenuOpen(false);
    navigate("/login");
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-card">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3h8l5 8-5 8H8l-5-8 5-8Z" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-slate-900 dark:text-white">Google Drive LLM</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">AI Assistant Dashboard</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {connection.connected ? (
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Google Drive: Connected
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <CloudOff className="h-4 w-4" />
              Google Drive: Not Connected
            </div>
            <a
              href={authApi.connectUrl()}
              className="rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-card transition hover:bg-brand-700"
            >
              Connect Google Drive
            </a>
          </div>
        )}

        <button
          onClick={toggleTheme}
          className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-2 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-200">
              {connection.email ? connection.email[0]?.toUpperCase() : "?"}
            </div>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                {connection.email ?? "Not signed in"}
              </div>
              <button
                onClick={() => {
                  navigate("/settings");
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Settings className="h-4 w-4" /> Settings
              </button>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
