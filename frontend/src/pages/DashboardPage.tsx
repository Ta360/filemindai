import { useCallback } from "react";
import ChatWindow from "../components/chat/ChatWindow";
import ImagePreviewPanel from "../components/ImagePreviewPanel";
import VideoPlayerPanel from "../components/VideoPlayerPanel";
import ChartPanel from "../components/ChartPanel";
import FileCard from "../components/FileCard";
import FolderCard from "../components/FolderCard";
import CalendarWidget from "../components/CalendarWidget";
import { useDashboard } from "../hooks/useDashboardStore";
import { analyticsApi } from "../services/api";
import { useState } from "react";

export default function DashboardPage() {
  const { currentFiles, currentFolders, currentChart, selectedImage, selectedVideo, sendMessage } = useDashboard();
  const [chart, setChart] = useState(currentChart);
  const [loadingChart, setLoadingChart] = useState(false);

  const refreshChart = useCallback(async () => {
    setLoadingChart(true);
    try {
      const data = await analyticsApi.get({});
      setChart({ type: "bar", title: "Files by Type", data: data.filesByType });
    } catch {
      /* surfaced elsewhere */
    } finally {
      setLoadingChart(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Chat with your AI Assistant, and watch results, previews, and analytics update live.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="h-[560px] xl:col-span-3">
          <ChatWindow />
        </div>
        <div className="space-y-4 xl:col-span-2">
          {(currentFiles.length > 0 || currentFolders.length > 0) && (
            <div className="max-h-[560px] space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Latest Results</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
                {currentFolders.slice(0, 4).map((f) => (
                  <FolderCard key={f.id} folder={f} />
                ))}
                {currentFiles.slice(0, 6).map((f) => (
                  <FileCard key={f.id} file={f} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ImagePreviewPanel file={selectedImage} />
        <VideoPlayerPanel file={selectedVideo} />
      </div>

      <ChartPanel
        data={chart ?? currentChart}
        onRefresh={refreshChart}
        isLoading={loadingChart}
        onBarClick={(d) => sendMessage(`Show me ${d.label} files`)}
        compact
      />

      <CalendarWidget compact />
    </div>
  );
}
