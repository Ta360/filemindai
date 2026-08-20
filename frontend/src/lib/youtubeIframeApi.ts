/**
 * Loads the YouTube IFrame Player API once and caches the promise. We need
 * the JS API (rather than a plain <iframe src="…embed/…">) so we can call
 * player.setPlaybackQuality('hd1080') — the `vq=` URL param YouTube used to
 * honor for this was deprecated and is now ignored.
 */

export interface YoutubePlayerEvent {
  target: YoutubePlayer;
  data: number | string;
}

export interface YoutubePlayer {
  destroy(): void;
  setPlaybackQuality(suggestedQuality: string): void;
  setPlaybackQualityRange(suggestedQuality: string, minQuality?: string): void;
  getPlaybackQuality(): string;
}

interface YoutubePlayerOptions {
  videoId: string;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (event: YoutubePlayerEvent) => void;
    onPlaybackQualityChange?: (event: YoutubePlayerEvent) => void;
  };
}

interface YoutubeIframeApi {
  Player: new (element: HTMLElement | string, options: YoutubePlayerOptions) => YoutubePlayer;
}

declare global {
  interface Window {
    YT?: YoutubeIframeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YoutubeIframeApi> | null = null;

export function loadYoutubeIframeApi(): Promise<YoutubeIframeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve(window.YT!);
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return apiPromise;
}
