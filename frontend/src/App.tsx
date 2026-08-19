import { Routes, Route } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import AuthGuard from "./components/AuthGuard";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AssistantPage from "./pages/AssistantPage";
import FilesPage from "./pages/FilesPage";
import FoldersPage from "./pages/FoldersPage";
import ImagesPage from "./pages/ImagesPage";
import VideosPage from "./pages/VideosPage";
import HistoryPage from "./pages/HistoryPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import CalendarPage from "./pages/CalendarPage";
import SettingsPage from "./pages/SettingsPage";
import GoogleAgentPage from "./pages/agents/GoogleAgentPage";
import YouTubeAgentPage from "./pages/agents/YouTubeAgentPage";
import InstagramAgentPage from "./pages/agents/InstagramAgentPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AuthGuard />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/files" element={<FilesPage />} />
          <Route path="/folders" element={<FoldersPage />} />
          <Route path="/images" element={<ImagesPage />} />
          <Route path="/videos" element={<VideosPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/agents/google" element={<GoogleAgentPage />} />
          <Route path="/agents/youtube" element={<YouTubeAgentPage />} />
          <Route path="/agents/instagram" element={<InstagramAgentPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
