import { useEffect, useRef } from "react";
import { Minus, Maximize2, X, PlayCircle } from "lucide-react";
import { useYoutubePlayer } from "../hooks/useYoutubePlayer";
import { loadYoutubeIframeApi, type YoutubePlayer } from "../lib/youtubeIframeApi";

/**
 * App-wide floating video player: videos picked from the YouTube Agent play
 * here via the YouTube iframe embed, never navigating away to youtube.com.
 * Persists across route changes (mounted once in DashboardLayout) and can be
 * minimized to a small pill or maximized back to a full player.
 *
 * Uses the YouTube IFrame Player API (not a plain <iframe src>) so we can
 * force playback quality to 1080p/HD — the `vq=` URL param YouTube used to
 * support for this was deprecated years ago and is now silently ignored.
 * YouTube still auto-downgrades quality if bandwidth is low, so we also
 * re-assert HD on every onPlaybackQualityChange event as a best effort.
 */
export default function FloatingYoutubePlayer() {
  const { nowPlaying, minimized, expanded, close, toggleMinimized, toggleExpanded } = useYoutubePlayer();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YoutubePlayer | null>(null);

  useEffect(() => {
    if (!nowPlaying || minimized || !containerRef.current) return;

    let cancelled = false;

    loadYoutubeIframeApi().then((YT) => {
      if (cancelled || !containerRef.current) return;
      playerRef.current = new YT.Player(containerRef.current, {
        videoId: nowPlaying.videoId,
        playerVars: { autoplay: 1, playsinline: 1, vq: "hd1080" },
        events: {
          onReady: (e) => {
            e.target.setPlaybackQualityRange("hd1080", "hd720");
            e.target.setPlaybackQuality("hd1080");
          },
          onPlaybackQualityChange: (e) => {
            if (e.data !== "hd1080" && e.data !== "hd2160") e.target.setPlaybackQuality("hd1080");
          },
        },
      });
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowPlaying?.videoId, minimized]);

  if (!nowPlaying) return null;

  if (minimized) {
    return (
      <button
        onClick={toggleMinimized}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl hover:bg-slate-800 dark:bg-brand-600 dark:hover:bg-brand-700"
      >
        <PlayCircle className="h-4 w-4" />
        <span className="max-w-[160px] truncate">{nowPlaying.title}</span>
      </button>
    );
  }

  return (
    <div
      className={`fixed z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900 ${
        expanded ? "bottom-5 right-5 w-[640px]" : "bottom-5 right-5 w-[360px]"
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{nowPlaying.title}</p>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={toggleExpanded} className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Maximize">
            <Maximize2 className="h-4 w-4" />
          </button>
          <button onClick={toggleMinimized} className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Minimize">
            <Minus className="h-4 w-4" />
          </button>
          <button onClick={close} className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="aspect-video w-full bg-black">
        <div key={nowPlaying.videoId} ref={containerRef} className="h-full w-full" />
      </div>
      <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">{nowPlaying.channelTitle}</div>
    </div>
  );
}
