import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import * as googleAgent from "../services/agents/googleAgentService";
import * as youtubeAgent from "../services/agents/youtubeAgentService";
import * as instagramAgent from "../services/agents/instagramAgentService";
import { renderAgentChart } from "../services/agents/chartClient";
import { agentActivityRepo } from "../database/repositories";
import { env } from "../config/env";
import type { AgentName } from "../../../shared/types";

export const agentRoutes = Router();
agentRoutes.use(requireAuth);

const querySchema = z.object({ query: z.string().min(1).max(500) });

// ---------------------------------------------------------------------------
// Google Agent — instant web-search-backed answers
// ---------------------------------------------------------------------------
agentRoutes.post(
  "/google/chat",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { query } = querySchema.parse(req.body);
    const result = await googleAgent.answerWithWebSearch(req.userId!, query);
    res.json(result);
  })
);

// ---------------------------------------------------------------------------
// YouTube Agent — search by channel/person/topic + view logging for the
// floating video player
// ---------------------------------------------------------------------------
agentRoutes.post(
  "/youtube/search",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { query } = querySchema.parse(req.body);
    const result = await youtubeAgent.searchVideos(req.userId!, query);
    res.json(result);
  })
);

const viewSchema = z.object({ videoTitle: z.string().min(1).max(300), channelTitle: z.string().min(1).max(300) });
agentRoutes.post(
  "/youtube/view",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { videoTitle, channelTitle } = viewSchema.parse(req.body);
    await youtubeAgent.recordVideoView(req.userId!, videoTitle, channelTitle);
    res.json({ ok: true });
  })
);

// ---------------------------------------------------------------------------
// Instagram Agent — OWN connected account only (Graph API OAuth)
// ---------------------------------------------------------------------------
agentRoutes.get(
  "/instagram/status",
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json(await instagramAgent.getStatus(req.userId!));
  })
);

agentRoutes.get(
  "/instagram/connect",
  asyncHandler(async (req: AuthedRequest, res) => {
    const url = instagramAgent.buildAuthorizeUrl(req.userId!);
    res.redirect(url);
  })
);

agentRoutes.get(
  "/instagram/callback",
  asyncHandler(async (req, res) => {
    const { code, state, error } = req.query as Record<string, string | undefined>;
    if (error || !code || !state) {
      return res.redirect(`${env.frontendUrl}/agents/instagram?instagramError=1`);
    }
    const userId = instagramAgent.resolveState(state);
    if (!userId) {
      return res.redirect(`${env.frontendUrl}/agents/instagram?instagramError=1`);
    }
    await instagramAgent.connectAccount(userId, code);
    res.redirect(`${env.frontendUrl}/agents/instagram?instagramConnected=1`);
  })
);

agentRoutes.post(
  "/instagram/disconnect",
  asyncHandler(async (req: AuthedRequest, res) => {
    await instagramAgent.disconnect(req.userId!);
    res.json({ ok: true });
  })
);

agentRoutes.get(
  "/instagram/media",
  asyncHandler(async (req: AuthedRequest, res) => {
    const media = await instagramAgent.getOwnMedia(req.userId!);
    res.json({ media });
  })
);

// ---------------------------------------------------------------------------
// Per-agent search history for the calendar view — real logged searches,
// scoped to a date range, so clicking a day shows exactly what was searched
// on that day for that agent.
// ---------------------------------------------------------------------------
const AGENTS: AgentName[] = ["google", "youtube", "instagram"];
agentRoutes.get(
  "/:agent/history",
  asyncHandler(async (req: AuthedRequest, res) => {
    const agent = req.params.agent as AgentName;
    if (!AGENTS.includes(agent)) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Unknown agent." });
    }
    const { start, end } = req.query as Record<string, string | undefined>;
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    const entries = await agentActivityRepo.listRange(req.userId!, agent, start || defaultStart, end || defaultEnd);
    res.json({ entries });
  })
);

// ---------------------------------------------------------------------------
// Matplotlib-rendered daily bar/pie usage charts, shared by all three agents
// ---------------------------------------------------------------------------
agentRoutes.get(
  "/:agent/chart/:kind",
  asyncHandler(async (req: AuthedRequest, res) => {
    const agent = req.params.agent as AgentName;
    const kind = req.params.kind as "bar" | "pie";
    if (!AGENTS.includes(agent) || (kind !== "bar" && kind !== "pie")) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Unknown agent or chart kind." });
    }
    const days = Number(req.query.days ?? 7);
    const png = await renderAgentChart(req.userId!, agent, kind, Number.isFinite(days) ? days : 7);
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "no-store");
    res.send(png);
  })
);
