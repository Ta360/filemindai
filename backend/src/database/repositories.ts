import { randomUUID } from "node:crypto";
import { dbCall } from "./dbClient";
import type { AgentActivityEntry, AgentName, AgentTopicCount, CalendarActivity, QueryIntent, SearchHistoryEntry } from "../../../shared/types";

// ---------------------------------------------------------------------------
// Every function here is async: in the Cloudflare deployment, dbCall() makes
// an HTTP round-trip to the Worker's D1-backed API (see
// worker/src/index.ts); locally/on the VPS it runs against SQLite directly
// (see opDispatch.local.ts). Callers always await these now — see
// dbClient.ts for why a container can't talk to D1 synchronously or
// directly.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Users & Google tokens
// ---------------------------------------------------------------------------
export interface StoredTokens {
  accessToken: string | null;
  refreshToken: string | null;
  scope: string | null;
  tokenType: string | null;
  expiryDate: number | null;
}

export const usersRepo = {
  async upsert(id: string, email: string, name: string) {
    await dbCall("users.upsert", [id, email, name]);
  },
  async get(id: string): Promise<{ id: string; email: string; name: string } | undefined> {
    const row = await dbCall<{ id: string; email: string; name: string } | null>("users.get", [id]);
    return row ?? undefined;
  },
};

export const tokensRepo = {
  async save(userId: string, tokens: StoredTokens) {
    await dbCall("tokens.save", [userId, tokens]);
  },
  async get(userId: string): Promise<StoredTokens | undefined> {
    const row = await dbCall<StoredTokens | null>("tokens.get", [userId]);
    return row ?? undefined;
  },
  async clear(userId: string) {
    await dbCall("tokens.clear", [userId]);
  },
};

// ---------------------------------------------------------------------------
// Search history
// ---------------------------------------------------------------------------
export const historyRepo = {
  async add(userId: string, entry: Omit<SearchHistoryEntry, "id" | "createdAt">): Promise<SearchHistoryEntry> {
    const id = randomUUID();
    await dbCall("history.add", [
      id,
      userId,
      entry.query,
      entry.queryType,
      entry.resultCount,
      entry.resultsSummary,
      entry.openedFileId,
      entry.openedFileName,
    ]);
    return { ...entry, id, createdAt: new Date().toISOString() };
  },
  async list(userId: string, limit = 100): Promise<SearchHistoryEntry[]> {
    return dbCall<SearchHistoryEntry[]>("history.list", [userId, limit]);
  },
  async listForDate(userId: string, isoDate: string): Promise<SearchHistoryEntry[]> {
    return dbCall<SearchHistoryEntry[]>("history.listForDate", [userId, isoDate]);
  },
  async remove(userId: string, id: string) {
    await dbCall("history.remove", [userId, id]);
  },
  async clear(userId: string) {
    await dbCall("history.clear", [userId]);
  },
};

// ---------------------------------------------------------------------------
// Calendar / activity log
// ---------------------------------------------------------------------------
export const activityRepo = {
  async add(userId: string, activity: Omit<CalendarActivity, "id" | "userId" | "timestamp">): Promise<CalendarActivity> {
    const id = randomUUID();
    await dbCall("activity.add", [
      id,
      userId,
      activity.action,
      activity.query,
      activity.fileId,
      activity.fileName,
      activity.folderId,
      activity.folderName,
      activity.metadata ? JSON.stringify(activity.metadata) : null,
    ]);
    return { ...activity, id, userId, timestamp: new Date().toISOString() };
  },
  async listRange(userId: string, start: string, end: string): Promise<CalendarActivity[]> {
    const rows = await dbCall<any[]>("activity.listRange", [userId, start, end]);
    return rows.map((r) => ({ ...r, metadata: r.metadata ? JSON.parse(r.metadata) : null }));
  },
};

// ---------------------------------------------------------------------------
// Chat message persistence (per conversation)
// ---------------------------------------------------------------------------
export const chatRepo = {
  async add(userId: string, conversationId: string, role: string, content: string, payload: unknown) {
    const id = randomUUID();
    await dbCall("chat.add", [id, userId, conversationId, role, content, payload ? JSON.stringify(payload) : null]);
    return id;
  },
  async list(userId: string, conversationId: string) {
    const rows = await dbCall<any[]>("chat.list", [userId, conversationId]);
    return rows.map((r) => ({ ...r, payload: r.payload ? JSON.parse(r.payload) : null }));
  },
  async clear(userId: string, conversationId: string) {
    await dbCall("chat.clear", [userId, conversationId]);
  },
};

// ---------------------------------------------------------------------------
// Instagram tokens (own-account only — Graph API, no third-party scraping)
// ---------------------------------------------------------------------------
export interface StoredInstagramTokens {
  accessToken: string;
  instagramUserId: string;
  username: string | null;
  expiryDate: number | null;
}

export const instagramTokensRepo = {
  async save(userId: string, tokens: StoredInstagramTokens) {
    await dbCall("instagramTokens.save", [userId, tokens]);
  },
  async get(userId: string): Promise<StoredInstagramTokens | undefined> {
    const row = await dbCall<StoredInstagramTokens | null>("instagramTokens.get", [userId]);
    return row ?? undefined;
  },
  async clear(userId: string) {
    await dbCall("instagramTokens.clear", [userId]);
  },
};

// ---------------------------------------------------------------------------
// Agent activity log (Google / YouTube / Instagram agents) — powers the daily
// bar/pie usage charts on each agent page. Every real search/view is logged
// here; charts read only from this table, never synthetic data.
// ---------------------------------------------------------------------------
export const agentActivityRepo = {
  async add(userId: string, entry: { agent: AgentName; action: string; topic: string; resultCount: number }): Promise<AgentActivityEntry> {
    const id = randomUUID();
    await dbCall("agentActivity.add", [id, userId, entry.agent, entry.action, entry.topic, entry.resultCount]);
    return { ...entry, id, timestamp: new Date().toISOString() };
  },
  /** Topic -> total count (bar/pie chart data), scoped to the last N days. */
  async topicCounts(userId: string, agent: AgentName, days = 7): Promise<AgentTopicCount[]> {
    const rows = await dbCall<{ topic: string; count: number }[]>("agentActivity.topicCounts", [userId, agent, `-${days} days`]);
    return rows.map((r) => ({ topic: r.topic, count: r.count }));
  },
  async listRecent(userId: string, agent: AgentName, limit = 50): Promise<AgentActivityEntry[]> {
    return dbCall<AgentActivityEntry[]>("agentActivity.listRecent", [userId, agent, limit]);
  },
  /** Real search/view history for one agent within a date range — powers the per-agent calendar view. */
  async listRange(userId: string, agent: AgentName, start: string, end: string): Promise<AgentActivityEntry[]> {
    return dbCall<AgentActivityEntry[]>("agentActivity.listRange", [userId, agent, start, end]);
  },
};

export type { QueryIntent };
