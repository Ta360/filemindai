import { env, isYoutubeConfigured } from "../../config/env";
import { agentActivityRepo } from "../../database/repositories";
import type { YoutubeSearchResponse, YoutubeVideoResult } from "../../../../shared/types";

const API_BASE = "https://www.googleapis.com/youtube/v3";

const HTML_ENTITIES: Record<string, string> = {
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
};

/** YouTube's API returns HTML-escaped snippet text (e.g. &quot;Brahmastra&quot;) — decode it once here. */
function decodeHtmlEntities(text: string): string {
  return text.replace(/&quot;|&#39;|&apos;|&amp;|&lt;|&gt;|&nbsp;/g, (m) => HTML_ENTITIES[m]);
}

/** Searches YouTube for videos matching a channel name, person/actress name, or free-text query. */
export async function searchVideos(userId: string, query: string): Promise<YoutubeSearchResponse> {
  if (!isYoutubeConfigured) throw new Error("YOUTUBE_NOT_CONFIGURED");

  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    q: query,
    maxResults: "16",
    safeSearch: "moderate",
    key: env.youtubeApiKey,
  });

  const res = await fetch(`${API_BASE}/search?${params.toString()}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`YOUTUBE_HTTP_${res.status}:${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as any;

  const videos: YoutubeVideoResult[] = (data.items ?? [])
    .filter((item: any) => item.id?.videoId)
    .map((item: any) => ({
      videoId: item.id.videoId,
      title: decodeHtmlEntities(item.snippet?.title ?? "Untitled"),
      channelTitle: decodeHtmlEntities(item.snippet?.channelTitle ?? "Unknown channel"),
      channelId: item.snippet?.channelId ?? "",
      thumbnailUrl:
        item.snippet?.thumbnails?.maxres?.url ??
        item.snippet?.thumbnails?.high?.url ??
        item.snippet?.thumbnails?.medium?.url ??
        item.snippet?.thumbnails?.default?.url ??
        "",
      publishedAt: item.snippet?.publishedAt ?? null,
      description: decodeHtmlEntities(item.snippet?.description ?? ""),
    }));

  agentActivityRepo
    .add(userId, { agent: "youtube", action: "search", topic: query.slice(0, 120), resultCount: videos.length })
    .catch((err) => console.error("[youtubeAgent] activity log failed", err));

  return { query, videos };
}

/** Records that the user actually pressed play on a video — this is the "video songs viewed" signal for the daily charts. */
export async function recordVideoView(userId: string, videoTitle: string, channelTitle: string) {
  await agentActivityRepo.add(userId, {
    agent: "youtube",
    action: "view",
    topic: (channelTitle || videoTitle).slice(0, 120),
    resultCount: 1,
  });
}
