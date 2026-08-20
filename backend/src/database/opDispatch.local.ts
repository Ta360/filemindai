import { db } from "./localSqlite";

/**
 * Local-SQLite implementation of the same named operations the Cloudflare
 * Worker's D1-backed dbOp() switch implements (see worker/src/index.ts) —
 * used for local dev and the VPS deployment, where the backend can talk to
 * its own SQLite file directly instead of going through the Worker/D1.
 * Wrapped in a resolved Promise so dbClient.ts has one uniform async
 * surface regardless of which driver is active.
 */
export async function localOp<T>(op: string, args: any[]): Promise<T> {
  switch (op) {
    case "users.upsert": {
      const [id, email, name] = args;
      db.prepare(
        `INSERT INTO users (id, email, name) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET email = excluded.email, name = excluded.name`
      ).run(id, email, name);
      return null as T;
    }
    case "users.get": {
      const [id] = args;
      return (db.prepare(`SELECT id, email, name FROM users WHERE id = ?`).get(id) ?? null) as T;
    }

    case "tokens.save": {
      const [userId, t] = args;
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
      ).run(userId, t.accessToken, t.refreshToken, t.scope, t.tokenType, t.expiryDate);
      return null as T;
    }
    case "tokens.get": {
      const [userId] = args;
      const row = db
        .prepare(
          `SELECT access_token as accessToken, refresh_token as refreshToken, scope, token_type as tokenType, expiry_date as expiryDate
           FROM google_tokens WHERE user_id = ?`
        )
        .get(userId);
      return (row ?? null) as T;
    }
    case "tokens.clear": {
      const [userId] = args;
      db.prepare(`DELETE FROM google_tokens WHERE user_id = ?`).run(userId);
      return null as T;
    }

    case "history.add": {
      const [id, userId, query, queryType, resultCount, resultsSummary, openedFileId, openedFileName] = args;
      db.prepare(
        `INSERT INTO search_history (id, user_id, query, query_type, result_count, results_summary, opened_file_id, opened_file_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, userId, query, queryType, resultCount, resultsSummary, openedFileId, openedFileName);
      return null as T;
    }
    case "history.list": {
      const [userId, limit] = args;
      return db
        .prepare(
          `SELECT id, query, query_type as queryType, created_at as createdAt, result_count as resultCount,
                  results_summary as resultsSummary, opened_file_id as openedFileId, opened_file_name as openedFileName
           FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
        )
        .all(userId, limit) as T;
    }
    case "history.listForDate": {
      const [userId, isoDate] = args;
      return db
        .prepare(
          `SELECT id, query, query_type as queryType, created_at as createdAt, result_count as resultCount,
                  results_summary as resultsSummary, opened_file_id as openedFileId, opened_file_name as openedFileName
           FROM search_history WHERE user_id = ? AND date(created_at) = date(?) ORDER BY created_at DESC`
        )
        .all(userId, isoDate) as T;
    }
    case "history.remove": {
      const [userId, id] = args;
      db.prepare(`DELETE FROM search_history WHERE user_id = ? AND id = ?`).run(userId, id);
      return null as T;
    }
    case "history.clear": {
      const [userId] = args;
      db.prepare(`DELETE FROM search_history WHERE user_id = ?`).run(userId);
      return null as T;
    }

    case "activity.add": {
      const [id, userId, action, query, fileId, fileName, folderId, folderName, metadata] = args;
      db.prepare(
        `INSERT INTO calendar_activity (id, user_id, action, query, file_id, file_name, folder_id, folder_name, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, userId, action, query, fileId, fileName, folderId, folderName, metadata);
      return null as T;
    }
    case "activity.listRange": {
      const [userId, start, end] = args;
      return db
        .prepare(
          `SELECT id, user_id as userId, action, query, file_id as fileId, file_name as fileName,
                  folder_id as folderId, folder_name as folderName, metadata, timestamp
           FROM calendar_activity WHERE user_id = ? AND timestamp BETWEEN ? AND ? ORDER BY timestamp DESC`
        )
        .all(userId, start, end) as T;
    }

    case "chat.add": {
      const [id, userId, conversationId, role, content, payload] = args;
      db.prepare(`INSERT INTO chat_messages (id, user_id, conversation_id, role, content, payload) VALUES (?, ?, ?, ?, ?, ?)`).run(
        id,
        userId,
        conversationId,
        role,
        content,
        payload
      );
      return null as T;
    }
    case "chat.list": {
      const [userId, conversationId] = args;
      return db
        .prepare(
          `SELECT id, role, content, payload, created_at as createdAt FROM chat_messages
           WHERE user_id = ? AND conversation_id = ? ORDER BY created_at ASC`
        )
        .all(userId, conversationId) as T;
    }
    case "chat.clear": {
      const [userId, conversationId] = args;
      db.prepare(`DELETE FROM chat_messages WHERE user_id = ? AND conversation_id = ?`).run(userId, conversationId);
      return null as T;
    }

    case "instagramTokens.save": {
      const [userId, t] = args;
      db.prepare(
        `INSERT INTO instagram_tokens (user_id, access_token, instagram_user_id, username, expiry_date, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET
           access_token = excluded.access_token,
           instagram_user_id = excluded.instagram_user_id,
           username = excluded.username,
           expiry_date = excluded.expiry_date,
           updated_at = datetime('now')`
      ).run(userId, t.accessToken, t.instagramUserId, t.username, t.expiryDate);
      return null as T;
    }
    case "instagramTokens.get": {
      const [userId] = args;
      const row = db
        .prepare(
          `SELECT access_token as accessToken, instagram_user_id as instagramUserId, username, expiry_date as expiryDate
           FROM instagram_tokens WHERE user_id = ?`
        )
        .get(userId);
      return (row ?? null) as T;
    }
    case "instagramTokens.clear": {
      const [userId] = args;
      db.prepare(`DELETE FROM instagram_tokens WHERE user_id = ?`).run(userId);
      return null as T;
    }

    case "agentActivity.add": {
      const [id, userId, agent, action, topic, resultCount] = args;
      db.prepare(`INSERT INTO agent_activity (id, user_id, agent, action, topic, result_count) VALUES (?, ?, ?, ?, ?, ?)`).run(
        id,
        userId,
        agent,
        action,
        topic,
        resultCount
      );
      return null as T;
    }
    case "agentActivity.topicCounts": {
      const [userId, agent, sinceModifier] = args;
      return db
        .prepare(
          `SELECT topic, SUM(result_count) as count FROM agent_activity
           WHERE user_id = ? AND agent = ? AND timestamp >= datetime('now', ?)
           GROUP BY topic ORDER BY count DESC LIMIT 12`
        )
        .all(userId, agent, sinceModifier) as T;
    }
    case "agentActivity.listRecent": {
      const [userId, agent, limit] = args;
      return db
        .prepare(
          `SELECT id, agent, action, topic, result_count as resultCount, timestamp
           FROM agent_activity WHERE user_id = ? AND agent = ? ORDER BY timestamp DESC LIMIT ?`
        )
        .all(userId, agent, limit) as T;
    }
    case "agentActivity.listRange": {
      const [userId, agent, start, end] = args;
      return db
        .prepare(
          `SELECT id, agent, action, topic, result_count as resultCount, timestamp
           FROM agent_activity WHERE user_id = ? AND agent = ? AND timestamp BETWEEN ? AND ?
           ORDER BY timestamp DESC`
        )
        .all(userId, agent, start, end) as T;
    }

    default:
      throw new Error(`UNKNOWN_DB_OP_${op}`);
  }
}
