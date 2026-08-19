import { useState } from "react";
import { Search, Loader2, PlayCircle } from "lucide-react";
import { agentsApi, ApiError } from "../../services/api";
import type { YoutubeVideoResult } from "../../types";
import { useYoutubePlayer } from "../../hooks/useYoutubePlayer";
import AgentChartPanel from "../../components/AgentChartPanel";
import AgentCalendarWidget from "../../components/AgentCalendarWidget";
import { formatDate } from "../../utils/format";

export default function YouTubeAgentPage() {
  const [query, setQuery] = useState("");
  const [videos, setVideos] = useState<YoutubeVideoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { play } = useYoutubePlayer();

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await agentsApi.youtubeSearch(q);
      setVideos(res.videos);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }

  function playVideo(v: YoutubeVideoResult) {
    play({ videoId: v.videoId, title: v.title, channelTitle: v.channelTitle });
    agentsApi.youtubeRecordView(v.title, v.channelTitle).catch(() => {});
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">YouTube Agent</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Search a channel, person, or actress name and play videos right here in the floating player — no redirect to YouTube.
        </p>
      </div>

      <form onSubmit={search} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. 'Arijit Singh', 'Taylor Swift', a channel name…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search
        </button>
      </form>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {videos.length === 0 && !loading && !error && (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400 dark:border-slate-700">
          Search a name or channel to see video results here.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v) => (
          <button
            key={v.videoId}
            onClick={() => playVideo(v)}
            className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-card hover:border-brand-400 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="relative aspect-video w-full bg-slate-100 dark:bg-slate-800">
              {v.thumbnailUrl && <img src={v.thumbnailUrl} alt={v.title} className="h-full w-full object-cover" />}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                <PlayCircle className="h-10 w-10 text-white opacity-0 transition group-hover:opacity-100" />
              </div>
            </div>
            <div className="p-3">
              <p className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">{v.title}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{v.channelTitle}</p>
              {v.publishedAt && <p className="mt-0.5 text-xs text-slate-400">{formatDate(v.publishedAt)}</p>}
            </div>
          </button>
        ))}
      </div>

      <AgentChartPanel agent="youtube" />

      <AgentCalendarWidget agent="youtube" />
    </div>
  );
}
