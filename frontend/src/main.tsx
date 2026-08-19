import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { DashboardProvider } from "./hooks/useDashboardStore";
import { YoutubePlayerProvider } from "./hooks/useYoutubePlayer";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <DashboardProvider>
        <YoutubePlayerProvider>
          <App />
        </YoutubePlayerProvider>
      </DashboardProvider>
    </BrowserRouter>
  </React.StrictMode>
);
