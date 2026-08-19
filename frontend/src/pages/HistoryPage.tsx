import { useCallback, useEffect, useState } from "react";
import { Trash2, RotateCcw, Search } from "lucide-react";
import { historyApi } from "../services/api";
import type { SearchHistoryEntry } from "../types";
import { useDashboard } from "../hooks/useDashboardStore";
import { formatDateTime } from "../utils/format";

export default function HistoryPage() {
  const { connection, sendMessage } = useDashboard();
  const [entries, setEntries] = useState<SearchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await historyApi.list();
      setEntries(res.entries);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (connection.connected) load();
  }, [connection.connected, load]);

  async function remove(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await historyApi.remove(id);
  }

  async function clearAll() {
    setEntries([]);
    await historyApi.clear();
  }

  if (!connection.connected) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Connect Google Drive to view search history.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Search History</h1>
        {entries.length > 0 && (
          <button onClick={clearAll} className="flex items-center gap-1 text-xs text-red-500 hover:underline">
            <Trash2 className="h-3.5 w-3.5" /> Clear all
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-slate-400">Loading…</p>}
      {!loading && entries.length === 0 && <p className="text-sm text-slate-400">No searches yet.</p>}

      <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {entries.map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" /> {e.query}
              </p>
              <p className="text-xs text-slate-400">
                {e.queryType} · {e.resultCount} results · {formatDateTime(e.createdAt)}
                {e.resultsSummary && ` · ${e.resultsSummary}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => sendMessage(e.query)}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Re-run
              </button>
              <button onClick={() => remove(e.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
