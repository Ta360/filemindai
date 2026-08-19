// Shared type contracts used by both frontend and backend.
// Keep this file framework-agnostic (no Express/React imports).

export type DriveFileKind = "document" | "spreadsheet" | "presentation" | "pdf" | "image" | "video" | "audio" | "folder" | "other";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  kind: DriveFileKind;
  size: number | null;
  createdTime: string | null;
  modifiedTime: string | null;
  owners: string[];
  parents: string[];
  parentName: string | null;
  webViewLink: string | null;
  webContentLink: string | null;
  thumbnailLink: string | null;
  iconLink: string | null;
  description: string | null;
  isFolder: boolean;
}

export interface DriveFolder {
  id: string;
  name: string;
  modifiedTime: string | null;
  parents: string[];
  parentName: string | null;
  webViewLink: string | null;
  iconLink: string | null;
  childCount: number | null;
}

export interface DriveSearchResult {
  files: DriveFile[];
  folders: DriveFolder[];
  nextPageToken: string | null;
  query: string;
}

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  intent?: QueryIntent;
  files?: DriveFile[];
  folders?: DriveFolder[];
  images?: DriveFile[];
  videos?: DriveFile[];
  webResults?: WebSearchResult[];
  chartData?: ChartData;
  citations?: string[];
  actions?: AIAction[];
  error?: string;
  isLoading?: boolean;
}

export type QueryIntent =
  | "DRIVE_SEARCH"
  | "DRIVE_FOLDER_SEARCH"
  | "WEB_SEARCH"
  | "FILE_OPEN"
  | "IMAGE_PREVIEW"
  | "VIDEO_PREVIEW"
  | "ANALYTICS"
  | "HISTORY"
  | "GENERAL";

export interface AIAction {
  type: "open_file" | "preview_image" | "play_video" | "show_chart" | "show_folders";
  fileId?: string;
  label: string;
}

export interface AIResponse {
  answer: string;
  intent: QueryIntent;
  files: DriveFile[];
  folders: DriveFolder[];
  images: DriveFile[];
  videos: DriveFile[];
  citations: string[];
  chartData: ChartData | null;
  actions: AIAction[];
  webResults: WebSearchResult[];
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  date: string | null;
  image: string | null;
}

export interface ChartDatum {
  label: string;
  value: number;
  color?: string;
}

export interface ChartData {
  type: "bar" | "pie" | "doughnut" | "line" | "area";
  title: string;
  data: ChartDatum[];
}

export interface DriveAnalytics {
  totalFiles: number;
  totalFolders: number;
  pdfCount: number;
  documentCount: number;
  spreadsheetCount: number;
  presentationCount: number;
  imageCount: number;
  videoCount: number;
  otherCount: number;
  filesByFolder: ChartDatum[];
  filesByMonth: ChartDatum[];
  filesByType: ChartDatum[];
}

export interface CalendarActivity {
  id: string;
  userId: string;
  action: string;
  query: string | null;
  fileId: string | null;
  fileName: string | null;
  folderId: string | null;
  folderName: string | null;
  timestamp: string;
  metadata: Record<string, unknown> | null;
}

export interface SearchHistoryEntry {
  id: string;
  query: string;
  queryType: QueryIntent;
  createdAt: string;
  resultCount: number;
  resultsSummary: string | null;
  openedFileId: string | null;
  openedFileName: string | null;
}

export interface DriveConnectionStatus {
  connected: boolean;
  email?: string;
  scopes?: string[];
}

// ---------------------------------------------------------------------------
// AI Agents: Google (instant web answer), YouTube (video search + player),
// Instagram (own-account media via Graph API)
// ---------------------------------------------------------------------------
export type AgentName = "google" | "youtube" | "instagram";

export interface GoogleAgentAnswer {
  answer: string;
  sources: WebSearchResult[];
  tookMs: number;
}

export interface YoutubeVideoResult {
  videoId: string;
  title: string;
  channelTitle: string;
  channelId: string;
  thumbnailUrl: string;
  publishedAt: string | null;
  description: string;
}

export interface YoutubeSearchResponse {
  query: string;
  videos: YoutubeVideoResult[];
}

export interface InstagramMediaItem {
  id: string;
  caption: string | null;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  mediaUrl: string;
  thumbnailUrl: string | null;
  permalink: string;
  timestamp: string;
}

export interface InstagramStatus {
  connected: boolean;
  username?: string;
}

export interface AgentActivityEntry {
  id: string;
  agent: AgentName;
  action: string;
  topic: string;
  resultCount: number;
  timestamp: string;
}

export interface AgentTopicCount {
  topic: string;
  count: number;
}
