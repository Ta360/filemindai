import { useCallback, useEffect, useState } from "react";
import ChartPanel from "../components/ChartPanel";
import { analyticsApi } from "../services/api";
import type { DriveAnalytics } from "../types";
import { useDashboard } from "../hooks/useDashboardStore";

const STAT_LABELS: [keyof DriveAnalytics, string][] = [
  ["totalFiles", "Total Files"],
  ["totalFolders", "Total Folders"],
  ["pdfCount", "PDFs"],
  ["imageCount", "Images"],
  ["videoCount", "Videos"],
];

export default function AnalyticsPage() {
  const { connection, sendMessage } = useDashboard();
  const [analytics, setAnalytics] = useState<DriveAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAnalytics(await analyticsApi.get({}));
    } catch {
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (connection.connected) load();
  }, [connection.connected, load]);

  if (!connection.connected) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Connect Google Drive to see analytics.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Analytics</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {STAT_LABELS.map(([key, label]) => (
          <div key={key} className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-card dark:border-slate-800 dark:bg-slate-900">
            <p className="text-2xl font-semibold text-slate-900 dark:text-white">{analytics ? (analytics[key] as number) : "—"}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      <ChartPanel
        data={analytics ? { type: "bar", title: "Files by Type", data: analytics.filesByType } : null}
        onRefresh={load}
        isLoading={loading}
        onBarClick={(d) => sendMessage(`Show me ${d.label} files`)}
      />
      <ChartPanel
        data={analytics ? { type: "bar", title: "Files by Folder", data: analytics.filesByFolder } : null}
        onBarClick={(d) => sendMessage(`Show files inside ${d.label}`)}
      />
      <ChartPanel data={analytics ? { type: "line", title: "Files by Month", data: analytics.filesByMonth } : null} />
    </div>
  );
}
