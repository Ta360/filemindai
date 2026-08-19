import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search, PlayCircle, Clock, CalendarDays } from "lucide-react";
import clsx from "clsx";
import { agentsApi } from "../services/api";
import type { AgentActivityEntry, AgentName } from "../types";

type ViewMode = "day" | "week" | "month";

const ACTION_ICON: Record<string, any> = {
  search: Search,
  view: PlayCircle,
  view_media: PlayCircle,
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}
function startOfWeek(d: Date) {
  const day = d.getDay();
  const s = new Date(d);
  s.setDate(d.getDate() - day);
  s.setHours(0, 0, 0, 0);
  return s;
}
function endOfWeek(d: Date) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

function describe(agent: AgentName, e: AgentActivityEntry): string {
  if (agent === "youtube") {
    if (e.action === "view") return `Played "${e.topic}"`;
    return `Searched "${e.topic}" — ${e.resultCount} results`;
  }
  if (agent === "instagram") return `Viewed ${e.resultCount} media from @${e.topic}`;
  return `Asked "${e.topic}" — ${e.resultCount} sources`;
}

/**
 * Per-agent calendar: click any date/day to see the real logged search
 * history (from agent_activity) for that agent on that day — no synthetic
 * data, same table that powers the bar/pie charts.
 */
export default function AgentCalendarWidget({ agent }: { agent: AgentName }) {
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(new Date());
  const [entries, setEntries] = useState<AgentActivityEntry[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);

  const range = useMemo(() => {
    if (view === "day") {
      const s = new Date(cursor);
      s.setHours(0, 0, 0, 0);
      const e = new Date(cursor);
      e.setHours(23, 59, 59, 999);
      return { start: s, end: e };
    }
    if (view === "week") return { start: startOfWeek(cursor), end: endOfWeek(cursor) };
    return { start: startOfMonth(cursor), end: endOfMonth(cursor) };
  }, [view, cursor]);

  useEffect(() => {
    setLoading(true);
    agentsApi
      .history(agent, range.start.toISOString(), range.end.toISOString())
      .then((r) => setEntries(r.entries))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent, range.start.getTime(), range.end.getTime()]);

  const dayEntries = entries.filter((e) => new Date(e.timestamp).toDateString() === selectedDay.toDateString());

  function shift(delta: number) {
    const next = new Date(cursor);
    if (view === "day") next.setDate(cursor.getDate() + delta);
    else if (view === "week") next.setDate(cursor.getDate() + delta * 7);
    else next.setMonth(cursor.getMonth() + delta);
    setCursor(next);
  }

  const monthDays = useMemo(() => {
    if (view !== "month") return [];
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    const days: Date[] = [];
    const gridStart = startOfWeek(start);
    const gridEnd = endOfWeek(end);
    for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  }, [view, cursor]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
          <CalendarDays className="h-4 w-4" /> Search History Calendar
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
            {(["day", "week", "month"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={clsx(
                  "rounded-md px-2 py-1 text-xs font-medium capitalize",
                  view === v ? "bg-brand-600 text-white" : "text-slate-500 dark:text-slate-400"
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <button onClick={() => shift(-1)} className="rounded-md p-1 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[110px] text-center text-xs font-medium text-slate-500 dark:text-slate-400">
            {view === "month"
              ? cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })
              : cursor.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </span>
          <button onClick={() => shift(1)} className="rounded-md p-1 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {view === "month" ? (
        <div className="grid grid-cols-7 gap-1 text-xs">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="p-1 text-center font-medium text-slate-400">
              {d}
            </div>
          ))}
          {monthDays.map((d, i) => {
            const dayCount = entries.filter((e) => new Date(e.timestamp).toDateString() === d.toDateString()).length;
            const inMonth = d.getMonth() === cursor.getMonth();
            const isToday = d.toDateString() === new Date().toDateString();
            const isSelected = d.toDateString() === selectedDay.toDateString();
            return (
              <button
                key={i}
                onClick={() => {
                  setSelectedDay(d);
                  setView("day");
                  setCursor(d);
                }}
                className={clsx(
                  "flex h-14 flex-col items-center justify-start rounded-md p-1 text-left hover:bg-slate-50 dark:hover:bg-slate-800",
                  !inMonth && "opacity-30",
                  isToday && "ring-1 ring-brand-400",
                  isSelected && "bg-brand-50 dark:bg-brand-900/40"
                )}
              >
                <span>{d.getDate()}</span>
                {dayCount > 0 && <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-500" />}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {loading && <p className="text-xs text-slate-400">Loading search history…</p>}
          {!loading && (view === "day" ? dayEntries : entries).length === 0 && (
            <p className="text-xs text-slate-400">
              No {agent === "google" ? "Google Agent" : "YouTube Agent"} search history for this{" "}
              {view === "day" ? "date" : "period"}.
            </p>
          )}
          {(view === "day" ? dayEntries : entries).slice(0, 50).map((e) => {
            const Icon = ACTION_ICON[e.action] ?? Clock;
            return (
              <div key={e.id} className="flex items-start gap-2 rounded-lg border border-slate-100 p-2 text-xs dark:border-slate-800">
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                <div>
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {new Date(e.timestamp).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                  </span>{" "}
                  <span className="text-slate-500 dark:text-slate-400">{describe(agent, e)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
