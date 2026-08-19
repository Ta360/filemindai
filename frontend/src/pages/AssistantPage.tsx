import ChatWindow from "../components/chat/ChatWindow";
import ImagePreviewPanel from "../components/ImagePreviewPanel";
import VideoPlayerPanel from "../components/VideoPlayerPanel";
import { useDashboard } from "../hooks/useDashboardStore";

export default function AssistantPage() {
  const { selectedImage, selectedVideo } = useDashboard();
  return (
    <div className="grid h-[calc(100vh-8rem)] grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="xl:col-span-2">
        <ChatWindow />
      </div>
      <div className="space-y-6 overflow-y-auto">
        <ImagePreviewPanel file={selectedImage} />
        <VideoPlayerPanel file={selectedVideo} />
      </div>
    </div>
  );
}
