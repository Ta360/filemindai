import { useCallback, useEffect, useState } from "react";
import { Search, Loader2, RefreshCw } from "lucide-react";
import { driveApi } from "../services/api";
import type { DriveFolder } from "../types";
import FolderCard from "../components/FolderCard";
import { useDashboard } from "../hooks/useDashboardStore";

export default function FoldersPage() {
  const { connection } = useDashboard();
  const [query, setQuery] = useState("");
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (pageToken?: string, q?: string) => {
    setLoading(true);
    try {
      const res = await driveApi.folders({ query: q ?? query, pageToken, pageSize: "24" });
      setFolders((prev) => (pageToken ? [...prev, ...res.folders] : res.folders));
      setNextPageToken(res.nextPageToken);
    } catch {
      if (!pageToken) setFolders([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    if (connection.connected) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection.connected]);

  if (!connection.connected) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Connect Google Drive to browse folders.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Folders</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load(undefined, query)}
              placeholder="Search folders..."
              className="w-44 bg-transparent text-sm outline-none dark:text-white"
            />
          </div>
          <button
            onClick={() => load()}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {folders.length === 0 && !loading ? (
        <p className="text-sm text-slate-400">No folders found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {folders.map((f) => (
            <FolderCard key={f.id} folder={f} />
          ))}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-4 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}

      {nextPageToken && !loading && (
        <div className="flex justify-center">
          <button
            onClick={() => load(nextPageToken)}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
