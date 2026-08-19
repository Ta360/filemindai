import type {
  AIResponse,
  DriveFile,
  DriveFolder,
  DriveAnalytics,
  CalendarActivity,
  SearchHistoryEntry,
  WebSearchResult,
  GoogleAgentAnswer,
  YoutubeSearchResponse,
  InstagramMediaItem,
  InstagramStatus,
  AgentName,
  AgentActivityEntry,
} from "../types";

const BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let body: any = {};
    try {
      body = await res.json();
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, body.error ?? "UNKNOWN", body.message ?? "Something went wrong.");
  }
  return res.json() as Promise<T>;
}

export const authApi = {
  status: () => request<{ connected: boolean; email?: string }>("/auth/status"),
  connectUrl: () => `${BASE}/auth/google`,
  logout: () => request<{ ok: true }>("/auth/logout", { method: "POST" }),
};

export const driveApi = {
  files: (params: Record<string, string | undefined>) =>
    request<{ files: DriveFile[]; nextPageToken: string | null }>(`/drive/files?${qs(params)}`),
  folders: (params: Record<string, string | undefined>) =>
    request<{ folders: DriveFolder[]; nextPageToken: string | null }>(`/drive/folders?${qs(params)}`),
  search: (params: Record<string, string | undefined>) =>
    request<{ files: DriveFile[]; folders: DriveFolder[]; nextPageToken: string | null; query: string }>(
      `/drive/search?${qs(params)}`
    ),
  file: (id: string) => request<DriveFile>(`/drive/file/${id}`),
  open: (id: string) => request<DriveFile>(`/drive/file/${id}/open`, { method: "POST" }),
  previewUrl: (id: string) => `${BASE}/drive/file/${id}/preview`,
  downloadUrl: (id: string) => `${BASE}/drive/file/${id}/download`,
};

export const aiApi = {
  chat: (conversationId: string, message: string) =>
    request<AIResponse>("/ai/chat", { method: "POST", body: JSON.stringify({ conversationId, message }) }),
  clear: (conversationId: string) => request<{ ok: true }>(`/ai/chat/${conversationId}`, { method: "DELETE" }),
};

export const webApi = {
  search: (query: string) => request<{ results: WebSearchResult[]; query: string }>("/web/search", { method: "POST", body: JSON.stringify({ query }) }),
};

export const historyApi = {
  list: (limit = 100) => request<{ entries: SearchHistoryEntry[] }>(`/history?limit=${limit}`),
  remove: (id: string) => request<{ ok: true }>(`/history/${id}`, { method: "DELETE" }),
  clear: () => request<{ ok: true }>("/history", { method: "DELETE" }),
};

export const analyticsApi = {
  get: (params: Record<string, string | undefined>) => request<DriveAnalytics>(`/analytics?${qs(params)}`),
};

export const calendarApi = {
  range: (start?: string, end?: string) =>
    request<{ entries: CalendarActivity[] }>(`/calendar?${qs({ start, end })}`),
};

export const agentsApi = {
  googleChat: (query: string) => request<GoogleAgentAnswer>("/agents/google/chat", { method: "POST", body: JSON.stringify({ query }) }),

  youtubeSearch: (query: string) => request<YoutubeSearchResponse>("/agents/youtube/search", { method: "POST", body: JSON.stringify({ query }) }),
  youtubeRecordView: (videoTitle: string, channelTitle: string) =>
    request<{ ok: true }>("/agents/youtube/view", { method: "POST", body: JSON.stringify({ videoTitle, channelTitle }) }),

  instagramStatus: () => request<InstagramStatus>("/agents/instagram/status"),
  instagramConnectUrl: () => `${BASE}/agents/instagram/connect`,
  instagramMedia: () => request<{ media: InstagramMediaItem[] }>("/agents/instagram/media"),
  instagramDisconnect: () => request<{ ok: true }>("/agents/instagram/disconnect", { method: "POST" }),

  chartUrl: (agent: AgentName, kind: "bar" | "pie") => `${BASE}/agents/${agent}/chart/${kind}?days=7&t=${Date.now()}`,

  history: (agent: AgentName, start?: string, end?: string) =>
    request<{ entries: AgentActivityEntry[] }>(`/agents/${agent}/history?${qs({ start, end })}`),
};

function qs(params: Record<string, string | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) usp.set(k, v);
  }
  return usp.toString();
}
