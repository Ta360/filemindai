import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Bot,
  Files,
  FolderOpen,
  Image as ImageIcon,
  Video,
  History,
  BarChart3,
  CalendarDays,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Terminal,
  Search,
  Youtube,
  Instagram,
} from "lucide-react";
import clsx from "clsx";
import { useDashboard } from "../hooks/useDashboardStore";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/assistant", label: "AI Assistant", icon: Bot },
  { to: "/files", label: "My Files", icon: Files },
  { to: "/folders", label: "Folders", icon: FolderOpen },
  { to: "/images", label: "Images", icon: ImageIcon },
  { to: "/videos", label: "Videos", icon: Video },
  { to: "/history", label: "Search History", icon: History },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/settings", label: "Settings", icon: Settings },
];

const AGENT_NAV_ITEMS = [
  { to: "/agents/google", label: "Google Agent", icon: Search },
  { to: "/agents/youtube", label: "YouTube Agent", icon: Youtube },
  { to: "/agents/instagram", label: "Instagram Agent", icon: Instagram },
];

const QUICK_COMMANDS = ["/folders", "/files", "/images", "/videos", "/recent", "/search", "/help"];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { sendMessage } = useDashboard();

  return (
    <aside
      className={clsx(
        "flex h-full shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-200 dark:border-slate-800 dark:bg-slate-950",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                    isActive
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  )
                }
                title={collapsed ? label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="mt-6">
          {!collapsed && (
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">AI Agents</p>
          )}
          <ul className="space-y-1">
            {AGENT_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    clsx(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                      isActive
                        ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    )
                  }
                  title={collapsed ? label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {!collapsed && (
          <div className="mt-6">
            <p className="mb-2 flex items-center gap-1.5 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Terminal className="h-3.5 w-3.5" /> Quick Commands
            </p>
            <ul className="space-y-1">
              {QUICK_COMMANDS.map((cmd) => (
                <li key={cmd}>
                  <button
                    onClick={() => sendMessage(cmd)}
                    className="w-full rounded-lg px-3 py-1.5 text-left font-mono text-xs text-slate-500 hover:bg-slate-100 hover:text-brand-600 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    {cmd}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-center gap-2 border-t border-slate-200 py-3 text-xs text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        {!collapsed && "Collapse"}
      </button>
    </aside>
  );
}
