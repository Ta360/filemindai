import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Instagram, Loader2, LogOut } from "lucide-react";
import { agentsApi, ApiError } from "../../services/api";
import type { InstagramMediaItem, InstagramStatus } from "../../types";
import ImagePreviewModal from "../../components/ImagePreviewModal";
import AgentChartPanel from "../../components/AgentChartPanel";

export default function InstagramAgentPage() {
  const [status, setStatus] = useState<InstagramStatus | null>(null);
  const [media, setMedia] = useState<InstagramMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<InstagramMediaItem | null>(null);
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    if (params.get("instagramConnected") || params.get("instagramError")) {
      const next = new URLSearchParams(params);
      next.delete("instagramConnected");
      next.delete("instagramError");
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    agentsApi
      .instagramStatus()
      .then(setStatus)
      .catch(() => setStatus({ connected: false }));
  }, [params]);

  useEffect(() => {
    if (!status?.connected) return;
    setLoading(true);
    setError(null);
    agentsApi
      .instagramMedia()
      .then((res) => setMedia(res.media))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load media."))
      .finally(() => setLoading(false));
  }, [status?.connected]);

  async function disconnect() {
    await agentsApi.instagramDisconnect();
    setStatus({ connected: false });
    setMedia([]);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Instagram Agent</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Connect your own Instagram account to browse your latest media here. For privacy, this only ever shows your
          own connected account — not other people's photos by username.
        </p>
      </div>

      {!status ? (
        <p className="text-sm text-slate-400">Checking connection…</p>
      ) : !status.connected ? (
        <a
          href={agentsApi.instagramConnectUrl()}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          <Instagram className="h-4 w-4" /> Connect Instagram
        </a>
      ) : (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            Connected as <span className="font-semibold">@{status.username ?? "unknown"}</span>
          </p>
          <button
            onClick={disconnect}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <LogOut className="h-3.5 w-3.5" /> Disconnect
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
      {loading && (
        <p className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your media…
        </p>
      )}

      {status?.connected && !loading && media.length === 0 && !error && (
        <p className="text-sm text-slate-400">No media found on your account yet.</p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {media.map((m) => (
          <button
            key={m.id}
            onClick={() => setPreview(m)}
            className="aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100 hover:opacity-90 dark:border-slate-800 dark:bg-slate-800"
          >
            <img src={m.thumbnailUrl ?? m.mediaUrl} alt={m.caption ?? "Instagram media"} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      <ImagePreviewModal item={preview} onClose={() => setPreview(null)} />

      <AgentChartPanel agent="instagram" />
    </div>
  );
}
