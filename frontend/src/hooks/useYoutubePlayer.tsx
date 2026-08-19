import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

interface NowPlaying {
  videoId: string;
  title: string;
  channelTitle: string;
}

interface YoutubePlayerState {
  nowPlaying: NowPlaying | null;
  minimized: boolean;
  expanded: boolean;
  play: (video: NowPlaying) => void;
  close: () => void;
  toggleMinimized: () => void;
  toggleExpanded: () => void;
}

const YoutubePlayerContext = createContext<YoutubePlayerState | null>(null);

export function YoutubePlayerProvider({ children }: { children: React.ReactNode }) {
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const play = useCallback((video: NowPlaying) => {
    setNowPlaying(video);
    setMinimized(false);
  }, []);
  const close = useCallback(() => setNowPlaying(null), []);
  const toggleMinimized = useCallback(() => setMinimized((m) => !m), []);
  const toggleExpanded = useCallback(() => setExpanded((e) => !e), []);

  const value = useMemo<YoutubePlayerState>(
    () => ({ nowPlaying, minimized, expanded, play, close, toggleMinimized, toggleExpanded }),
    [nowPlaying, minimized, expanded, play, close, toggleMinimized, toggleExpanded]
  );

  return <YoutubePlayerContext.Provider value={value}>{children}</YoutubePlayerContext.Provider>;
}

export function useYoutubePlayer(): YoutubePlayerState {
  const ctx = useContext(YoutubePlayerContext);
  if (!ctx) throw new Error("useYoutubePlayer must be used within YoutubePlayerProvider");
  return ctx;
}
