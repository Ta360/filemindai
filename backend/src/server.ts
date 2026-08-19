import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "node:path";
import fs from "node:fs";
import { env } from "./config/env";
import "./database/db";
import { attachUser } from "./middleware/auth";
import { errorHandler } from "./middleware/errorHandler";
import { authRoutes } from "./routes/authRoutes";
import { driveRoutes } from "./routes/driveRoutes";
import { aiRoutes } from "./routes/aiRoutes";
import { webRoutes } from "./routes/webRoutes";
import { historyRoutes } from "./routes/historyRoutes";
import { analyticsRoutes } from "./routes/analyticsRoutes";
import { calendarRoutes } from "./routes/calendarRoutes";
import { agentRoutes } from "./routes/agentRoutes";

const app = express();

// Behind nginx in production, so req.ip / req.secure reflect the real client
// via X-Forwarded-* headers instead of the proxy's own address.
if (env.nodeEnv === "production") {
  app.set("trust proxy", 1);
}

app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(attachUser);

const apiLimiter = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false });
app.use("/api", apiLimiter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/drive", driveRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/web", webRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/agents", agentRoutes);

app.use("/api", (_req, res) => res.status(404).json({ error: "NOT_FOUND", message: "Route not found." }));
app.use(errorHandler);

// In production, serve the built frontend from the same origin (same-site cookies, no CORS).
const frontendDist = path.resolve(process.cwd(), "../frontend/dist");
if (env.nodeEnv === "production" && fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(frontendDist, "index.html")));
}

app.listen(env.port, () => {
  console.log(`Google Drive LLM backend listening on http://localhost:${env.port}`);
});
