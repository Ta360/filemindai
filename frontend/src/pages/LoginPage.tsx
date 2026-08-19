import { useEffect } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Bot, FolderSearch, BarChart3, Youtube, Instagram, Search, ShieldCheck } from "lucide-react";
import { useDashboard } from "../hooks/useDashboardStore";
import { authApi } from "../services/api";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "That sign-in link expired or was tampered with. Please try again.",
  auth_failed: "Google sign-in didn't complete. Please try again.",
};

const FEATURES = [
  { icon: Bot, label: "AI Assistant over your own Google Drive" },
  { icon: Search, label: "Google Agent — instant, web-sourced answers" },
  { icon: Youtube, label: "YouTube Agent with an in-app video player" },
  { icon: Instagram, label: "Instagram Agent for your own connected account" },
  { icon: FolderSearch, label: "Natural-language file & folder search" },
  { icon: BarChart3, label: "Live analytics, calendar activity & charts" },
];

export default function LoginPage() {
  const { connection, authChecked } = useDashboard();
  const [params] = useSearchParams();
  const driveError = params.get("driveError");

  useEffect(() => {
    document.title = "Sign in — Google Drive LLM";
  }, []);

  // Already signed in — don't show the login screen.
  if (authChecked && connection.connected) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-brand-50 px-4 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-2">
        {/* Left: branding + feature highlights */}
        <div className="hidden flex-col justify-between bg-brand-600 p-10 text-white lg:flex">
          <div>
            <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3h8l5 8-5 8H8l-5-8 5-8Z" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold leading-tight">Google Drive LLM</h1>
            <p className="mt-1 text-sm text-brand-100">AI Assistant Dashboard</p>
            <p className="mt-6 text-sm leading-relaxed text-brand-50">
              Search, open, and analyze your own Google Drive with natural language — plus dedicated AI agents for
              the web, YouTube, and your own Instagram account, all in one place.
            </p>
          </div>

          <ul className="space-y-3">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm text-brand-50">
                <Icon className="h-4 w-4 shrink-0 text-brand-200" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* Right: sign in / sign up */}
        <div className="flex flex-col justify-center p-8 sm:p-10">
          <div className="mb-8 lg:hidden">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3h8l5 8-5 8H8l-5-8 5-8Z" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Google Drive LLM</h1>
          </div>

          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Welcome</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Sign in or create your account with Google to continue.
          </p>

          {driveError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
              {ERROR_MESSAGES[driveError] ?? "Something went wrong signing you in. Please try again."}
            </div>
          )}

          <div className="mt-6 space-y-3">
            <a
              href={authApi.connectUrl()}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <GoogleIcon />
              Sign in with Google
            </a>
            <a
              href={authApi.connectUrl()}
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-brand-700"
            >
              <GoogleIcon light />
              Sign up with Google
            </a>
          </div>

          <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-slate-400 dark:text-slate-500">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Sign in and sign up both use the same secure Google OAuth flow — there's no separate password to create
            or remember. We only request read-only Drive access and basic profile info.
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon({ light = false }: { light?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0">
      <path
        fill={light ? "#ffffff" : "#4285F4"}
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill={light ? "#ffffff" : "#34A853"}
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill={light ? "#ffffff" : "#FBBC05"}
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill={light ? "#ffffff" : "#EA4335"}
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
