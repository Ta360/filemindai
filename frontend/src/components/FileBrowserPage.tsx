import { useCallback, useEffect, useState } from "react";
import { Search, Loader2, RefreshCw } from "lucide-react";
import { driveApi } from "../services/api";
import type { DriveFile } from "../types";
import FileCard from "./FileCard";
import FileDetailsDrawer from "./FileDetailsDrawer";
import { useDashboard } from "../hooks/useDashboardStore";

export default function FileBrowserPage({ title, mimeTypeGroup }: { title: string; mimeTypeGroup?: string }) {
  const { connection } = useDashboard();
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<DriveFile | null>(null);
  const [sortAsc, setSortAsc] = useState(false);

  const load = useCallback(
    async (pageToken?: string, q?: string) => {
      setLoading(true);
      try {
        const res = await driveApi.files({ query: q ?? query, mimeTypeGroup, pageToken, pageSize: "24" });
        setFiles((prev) => (pageToken ? [...prev, ...res.files] : res.files));
        setNextPageToken(res.nextPageToken);
      } catch {
        if (!pageToken) setFiles([]);
      } finally {
        setLoading(false);
      }
    },
    [query, mimeTypeGroup]
  );

  useEffect(() => {
    if (connection.connected) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection.connected]);

  const sorted = [...files].sort((a, b) => {
    const ta = a.modifiedTime ? new Date(a.modifiedTime).getTime() : 0;
    const tb = b.modifiedTime ? new Date(b.modifiedTime).getTime() : 0;
    return sortAsc ? ta - tb : tb - ta;
  });

  if (!connection.connected) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Connect Google Drive to browse {title.toLowerCase()}.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load(undefined, query)}
              placeholder="Search..."
              className="w-40 bg-transparent text-sm outline-none dark:text-white"
            />
          </div>
          <select
            value={sortAsc ? "asc" : "desc"}
            onChange={(e) => setSortAsc(e.target.value === "asc")}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
          <button
            onClick={() => load()}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {sorted.length === 0 && !loading ? (
        <p className="text-sm text-slate-400">No results yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((f) => (
            <FileCard key={f.id} file={f} onDetails={setDetails} />
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

      <FileDetailsDrawer file={details} onClose={() => setDetails(null)} />
    </div>
  );
}
