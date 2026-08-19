import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { aiApi, authApi, driveApi, ApiError } from "../services/api";
import type { ChatMessage, DriveFile, DriveFolder, ChartData, DriveConnection } from "../types";

interface DashboardState {
  connection: DriveConnection;
  authChecked: boolean;
  refreshConnection: () => Promise<void>;
  conversationId: string;
  messages: ChatMessage[];
  isSending: boolean;
  sendMessage: (text: string) => Promise<void>;
  clearConversation: () => void;
  retryLast: () => Promise<void>;

  currentFiles: DriveFile[];
  currentFolders: DriveFolder[];
  currentImages: DriveFile[];
  currentVideos: DriveFile[];
  currentChart: ChartData | null;

  selectedImage: DriveFile | null;
  selectedVideo: DriveFile | null;
  previewImage: (file: DriveFile) => void;
  playVideo: (file: DriveFile) => void;

  openFile: (file: DriveFile) => Promise<void>;
}

const DashboardContext = createContext<DashboardState | null>(null);

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [connection, setConnection] = useState<DriveConnection>({ connected: false });
  const [authChecked, setAuthChecked] = useState(false);
  const [conversationId] = useState(() => newId());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);

  const [currentFiles, setCurrentFiles] = useState<DriveFile[]>([]);
  const [currentFolders, setCurrentFolders] = useState<DriveFolder[]>([]);
  const [currentImages, setCurrentImages] = useState<DriveFile[]>([]);
  const [currentVideos, setCurrentVideos] = useState<DriveFile[]>([]);
  const [currentChart, setCurrentChart] = useState<ChartData | null>(null);

  const [selectedImage, setSelectedImage] = useState<DriveFile | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<DriveFile | null>(null);

  const refreshConnection = useCallback(async () => {
    try {
      const status = await authApi.status();
      setConnection(status);
    } catch {
      setConnection({ connected: false });
    } finally {
      setAuthChecked(true);
    }
  }, []);

  // Check auth status once on load, before any route-level decision (like the
  // login-page guard) needs to know whether the user is signed in.
  useEffect(() => {
    refreshConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyResultsToPanels = useCallback((response: Awaited<ReturnType<typeof aiApi.chat>>) => {
    setCurrentFiles(response.files);
    setCurrentFolders(response.folders);
    setCurrentImages(response.images);
    setCurrentVideos(response.videos);
    setCurrentChart(response.chartData);
    if (response.images.length > 0) setSelectedImage(response.images[0]);
    if (response.videos.length > 0) setSelectedVideo(response.videos[0]);
  }, []);

  const pushMessage = useCallback((m: ChatMessage) => {
    setMessages((prev) => [...prev, m]);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setLastUserMessage(text);
      const userMsg: ChatMessage = { id: newId(), role: "user", content: text, createdAt: new Date().toISOString() };
      const loadingMsg: ChatMessage = { id: newId(), role: "assistant", content: "", createdAt: new Date().toISOString(), isLoading: true };
      pushMessage(userMsg);
      pushMessage(loadingMsg);
      setIsSending(true);
      try {
        const response = await aiApi.chat(conversationId, text);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMsg.id
              ? {
                  ...m,
                  isLoading: false,
                  content: response.answer,
                  intent: response.intent,
                  files: response.files,
                  folders: response.folders,
                  images: response.images,
                  videos: response.videos,
                  webResults: response.webResults,
                  chartData: response.chartData ?? undefined,
                  citations: response.citations,
                  actions: response.actions,
                }
              : m
          )
        );
        applyResultsToPanels(response);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "AI service is temporarily unavailable. Please try again.";
        setMessages((prev) => prev.map((m) => (m.id === loadingMsg.id ? { ...m, isLoading: false, error: message } : m)));
      } finally {
        setIsSending(false);
      }
    },
    [conversationId, pushMessage, applyResultsToPanels]
  );

  const retryLast = useCallback(async () => {
    if (lastUserMessage) await sendMessage(lastUserMessage);
  }, [lastUserMessage, sendMessage]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    aiApi.clear(conversationId).catch(() => {});
  }, [conversationId]);

  const previewImage = useCallback((file: DriveFile) => setSelectedImage(file), []);
  const playVideo = useCallback((file: DriveFile) => setSelectedVideo(file), []);

  const openFile = useCallback(async (file: DriveFile) => {
    try {
      await driveApi.open(file.id);
    } catch {
      /* non-fatal: still open the link even if activity logging fails */
    }
    if (file.webViewLink) {
      window.open(file.webViewLink, "_blank", "noopener,noreferrer");
    }
  }, []);

  const value = useMemo<DashboardState>(
    () => ({
      connection,
      authChecked,
      refreshConnection,
      conversationId,
      messages,
      isSending,
      sendMessage,
      clearConversation,
      retryLast,
      currentFiles,
      currentFolders,
      currentImages,
      currentVideos,
      currentChart,
      selectedImage,
      selectedVideo,
      previewImage,
      playVideo,
      openFile,
    }),
    [
      connection,
      authChecked,
      refreshConnection,
      conversationId,
      messages,
      isSending,
      sendMessage,
      clearConversation,
      retryLast,
      currentFiles,
      currentFolders,
      currentImages,
      currentVideos,
      currentChart,
      selectedImage,
      selectedVideo,
      previewImage,
      playVideo,
      openFile,
    ]
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard(): DashboardState {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
