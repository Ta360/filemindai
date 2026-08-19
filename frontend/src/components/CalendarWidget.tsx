import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search, FolderOpen, FileText, Image as ImageIcon, Video, Clock } from "lucide-react";
import { calendarApi } from "../services/api";
import type { CalendarActivity } from "../types";
import clsx from "clsx";

type ViewMode = "day" | "week" | "month";

const ACTION_ICON: Record<string, any> = {
  search: Search,
  open_file: FileText,
  open_folder: FolderOpen,
  view_image: ImageIcon,
  view_video: Video,
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

export default function CalendarWidget({ compact = false }: { compact?: boolean }) {
  const [view, setView] = useState<ViewMode>(compact ? "day" : "month");
  const [cursor, setCursor] = useState(new Date());
  const [entries, setEntries] = useState<CalendarActivity[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);

  const range = useMemo(() => {
    if (view === "day") return { start: new Date(cursor.setHours(0, 0, 0, 0)), end: new Date(cursor.setHours(23, 59, 59, 999)) };
    if (view === "week") return { start: startOfWeek(cursor), end: endOfWeek(cursor) };
    return { start: startOfMonth(cursor), end: endOfMonth(cursor) };
  }, [view, cursor]);

  useEffect(() => {
    setLoading(true);
    calendarApi
      .range(range.start.toISOString(), range.end.toISOString())
      .then((r) => setEntries(r.entries))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [range.start.getTime(), range.end.getTime()]);

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
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Activity Calendar</h3>
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
          <button onClick={() => shift(-1)} className="rounded-md p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => shift(1)} className="rounded-md p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
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
            const count = entries.filter((e) => new Date(e.timestamp).toDateString() === d.toDateString()).length;
            const inMonth = d.getMonth() === cursor.getMonth();
            return (
              <button
                key={i}
                onClick={() => {
                  setSelectedDay(d);
                  setView("day");
                }}
                className={clsx(
                  "flex h-14 flex-col items-center justify-start rounded-md p-1 text-left hover:bg-slate-50 dark:hover:bg-slate-800",
                  !inMonth && "opacity-30"
                )}
              >
                <span>{d.getDate()}</span>
                {count > 0 && <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-500" />}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {loading && <p className="text-xs text-slate-400">Loading activity…</p>}
          {!loading && (view === "day" ? dayEntries : entries).length === 0 && (
            <p className="text-xs text-slate-400">No activity recorded for this period.</p>
          )}
          {(view === "day" ? dayEntries : entries).slice(0, compact ? 5 : 50).map((e) => {
            const Icon = ACTION_ICON[e.action] ?? Clock;
            return (
              <div key={e.id} className="flex items-start gap-2 rounded-lg border border-slate-100 p-2 text-xs dark:border-slate-800">
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                <div>
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {new Date(e.timestamp).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                  </span>{" "}
                  <span className="text-slate-500 dark:text-slate-400">
                    {e.action === "search" && `Searched "${e.query}"`}
                    {e.action === "open_file" && `Opened "${e.fileName}"`}
                    {!["search", "open_file"].includes(e.action) && e.action}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
