import { randomUUID } from "node:crypto";
import { db } from "./db";
import type { AgentActivityEntry, AgentName, AgentTopicCount, CalendarActivity, QueryIntent, SearchHistoryEntry } from "../../../shared/types";

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
  upsert(id: string, email: string, name: string) {
    db.prepare(
      `INSERT INTO users (id, email, name) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET email = excluded.email, name = excluded.name`
    ).run(id, email, name);
  },
  get(id: string): { id: string; email: string; name: string } | undefined {
    return db.prepare(`SELECT id, email, name FROM users WHERE id = ?`).get(id) as any;
  },
};

export const tokensRepo = {
  save(userId: string, tokens: StoredTokens) {
    db.prepare(
      `INSERT INTO google_tokens (user_id, access_token, refresh_token, scope, token_type, expiry_date, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         access_token = excluded.access_token,
         refresh_token = COALESCE(excluded.refresh_token, google_tokens.refresh_token),
         scope = excluded.scope,
         token_type = excluded.token_type,
         expiry_date = excluded.expiry_date,
         updated_at = datetime('now')`
    ).run(userId, tokens.accessToken, tokens.refreshToken, tokens.scope, tokens.tokenType, tokens.expiryDate);
  },
  get(userId: string): StoredTokens | undefined {
    const row = db
      .prepare(
        `SELECT access_token as accessToken, refresh_token as refreshToken, scope, token_type as tokenType, expiry_date as expiryDate
         FROM google_tokens WHERE user_id = ?`
      )
      .get(userId) as StoredTokens | undefined;
    return row;
  },
  clear(userId: string) {
    db.prepare(`DELETE FROM google_tokens WHERE user_id = ?`).run(userId);
  },
};

// ---------------------------------------------------------------------------
// Search history
// ---------------------------------------------------------------------------
export const historyRepo = {
  add(userId: string, entry: Omit<SearchHistoryEntry, "id" | "createdAt">): SearchHistoryEntry {
    const id = randomUUID();
    db.prepare(
      `INSERT INTO search_history (id, user_id, query, query_type, result_count, results_summary, opened_file_id, opened_file_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, userId, entry.query, entry.queryType, entry.resultCount, entry.resultsSummary, entry.openedFileId, entry.openedFileName);
    return { ...entry, id, createdAt: new Date().toISOString() };
  },
  list(userId: string, limit = 100): SearchHistoryEntry[] {
    return db
      .prepare(
        `SELECT id, query, query_type as queryType, created_at as createdAt, result_count as resultCount,
                results_summary as resultsSummary, opened_file_id as openedFileId, opened_file_name as openedFileName
         FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
      )
      .all(userId, limit) as unknown as SearchHistoryEntry[];
  },
  listForDate(userId: string, isoDate: string): SearchHistoryEntry[] {
    return db
      .prepare(
        `SELECT id, query, query_type as queryType, created_at as createdAt, result_count as resultCount,
                results_summary as resultsSummary, opened_file_id as openedFileId, opened_file_name as openedFileName
         FROM search_history WHERE user_id = ? AND date(created_at) = date(?) ORDER BY created_at DESC`
      )
      .all(userId, isoDate) as unknown as SearchHistoryEntry[];
  },
  remove(userId: string, id: string) {
    db.prepare(`DELETE FROM search_history WHERE user_id = ? AND id = ?`).run(userId, id);
  },
  clear(userId: string) {
    db.prepare(`DELETE FROM search_history WHERE user_id = ?`).run(userId);
  },
};

// ---------------------------------------------------------------------------
// Calendar / activity log
// ---------------------------------------------------------------------------
export const activityRepo = {
  add(userId: string, activity: Omit<CalendarActivity, "id" | "userId" | "timestamp">): CalendarActivity {
    const id = randomUUID();
    db.prepare(
      `INSERT INTO calendar_activity (id, user_id, action, query, file_id, file_name, folder_id, folder_name, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      userId,
      activity.action,
      activity.query,
      activity.fileId,
      activity.fileName,
      activity.folderId,
      activity.folderName,
      activity.metadata ? JSON.stringify(activity.metadata) : null
    );
    return { ...activity, id, userId, timestamp: new Date().toISOString() };
  },
  listRange(userId: string, start: string, end: string): CalendarActivity[] {
    const rows = db
      .prepare(
        `SELECT id, user_id as userId, action, query, file_id as fileId, file_name as fileName,
                folder_id as folderId, folder_name as folderName, metadata, timestamp
         FROM calendar_activity WHERE user_id = ? AND timestamp BETWEEN ? AND ? ORDER BY timestamp DESC`
      )
      .all(userId, start, end) as any[];
    return rows.map((r) => ({ ...r, metadata: r.metadata ? JSON.parse(r.metadata) : null }));
  },
};

// ---------------------------------------------------------------------------
// Chat message persistence (per conversation)
// ---------------------------------------------------------------------------
export const chatRepo = {
  add(userId: string, conversationId: string, role: string, content: string, payload: unknown) {
    const id = randomUUID();
    db.prepare(
      `INSERT INTO chat_messages (id, user_id, conversation_id, role, content, payload) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, userId, conversationId, role, content, payload ? JSON.stringify(payload) : null);
    return id;
  },
  list(userId: string, conversationId: string) {
    const rows = db
      .prepare(
        `SELECT id, role, content, payload, created_at as createdAt FROM chat_messages
         WHERE user_id = ? AND conversation_id = ? ORDER BY created_at ASC`
      )
      .all(userId, conversationId) as any[];
    return rows.map((r) => ({ ...r, payload: r.payload ? JSON.parse(r.payload) : null }));
  },
  clear(userId: string, conversationId: string) {
    db.prepare(`DELETE FROM chat_messages WHERE user_id = ? AND conversation_id = ?`).run(userId, conversationId);
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
  save(userId: string, tokens: StoredInstagramTokens) {
    db.prepare(
      `INSERT INTO instagram_tokens (user_id, access_token, instagram_user_id, username, expiry_date, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         access_token = excluded.access_token,
         instagram_user_id = excluded.instagram_user_id,
         username = excluded.username,
         expiry_date = excluded.expiry_date,
         updated_at = datetime('now')`
    ).run(userId, tokens.accessToken, tokens.instagramUserId, tokens.username, tokens.expiryDate);
  },
  get(userId: string): StoredInstagramTokens | undefined {
    return db
      .prepare(
        `SELECT access_token as accessToken, instagram_user_id as instagramUserId, username, expiry_date as expiryDate
         FROM instagram_tokens WHERE user_id = ?`
      )
      .get(userId) as StoredInstagramTokens | undefined;
  },
  clear(userId: string) {
    db.prepare(`DELETE FROM instagram_tokens WHERE user_id = ?`).run(userId);
  },
};

// ---------------------------------------------------------------------------
// Agent activity log (Google / YouTube / Instagram agents) — powers the daily
// bar/pie usage charts on each agent page. Every real search/view is logged
// here; charts read only from this table, never synthetic data.
// ---------------------------------------------------------------------------
export const agentActivityRepo = {
  add(userId: string, entry: { agent: AgentName; action: string; topic: string; resultCount: number }): AgentActivityEntry {
    const id = randomUUID();
    db.prepare(
      `INSERT INTO agent_activity (id, user_id, agent, action, topic, result_count) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, userId, entry.agent, entry.action, entry.topic, entry.resultCount);
    return { ...entry, id, timestamp: new Date().toISOString() };
  },
  /** Topic -> total count (bar/pie chart data), scoped to the last N days. */
  topicCounts(userId: string, agent: AgentName, days = 7): AgentTopicCount[] {
    const rows = db
      .prepare(
        `SELECT topic, SUM(result_count) as count FROM agent_activity
         WHERE user_id = ? AND agent = ? AND timestamp >= datetime('now', ?)
         GROUP BY topic ORDER BY count DESC LIMIT 12`
      )
      .all(userId, agent, `-${days} days`) as { topic: string; count: number }[];
    return rows.map((r) => ({ topic: r.topic, count: r.count }));
  },
  listRecent(userId: string, agent: AgentName, limit = 50): AgentActivityEntry[] {
    return db
      .prepare(
        `SELECT id, agent, action, topic, result_count as resultCount, timestamp
         FROM agent_activity WHERE user_id = ? AND agent = ? ORDER BY timestamp DESC LIMIT ?`
      )
      .all(userId, agent, limit) as unknown as AgentActivityEntry[];
  },
  /** Real search/view history for one agent within a date range — powers the per-agent calendar view. */
  listRange(userId: string, agent: AgentName, start: string, end: string): AgentActivityEntry[] {
    return db
      .prepare(
        `SELECT id, agent, action, topic, result_count as resultCount, timestamp
         FROM agent_activity WHERE user_id = ? AND agent = ? AND timestamp BETWEEN ? AND ?
         ORDER BY timestamp DESC`
      )
      .all(userId, agent, start, end) as unknown as AgentActivityEntry[];
  },
};

export type { QueryIntent };
