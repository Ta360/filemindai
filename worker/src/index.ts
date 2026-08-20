import { Container, getContainer } from "@cloudflare/containers";
import { DurableObject } from "cloudflare:workers";

export interface Env {
  APP_CONTAINER: DurableObjectNamespace<AppContainer>;
  DB: D1Database;
  INTERNAL_DB_SECRET: string;
  OPENAI_API_KEY: string;
  OPENAI_MODEL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  SESSION_SECRET: string;
  WEB_SEARCH_PROVIDER: string;
  SEARCH_API_KEY: string;
  YOUTUBE_API_KEY: string;
  INSTAGRAM_APP_ID: string;
  INSTAGRAM_APP_SECRET: string;
  INSTAGRAM_REDIRECT_URI: string;
  FRONTEND_URL: string;
}

// ---------------------------------------------------------------------------
// The container (Node backend + Python chart service, see ../Dockerfile)
// cannot access the D1 binding directly — only code running in the Worker
// can. The container instead makes a real HTTPS request back to this same
// Worker's own domain at /__internal-db/<op> (see the fetch handler below
// and backend/src/database/dbClient.ts for the container-side half), which
// this function answers using env.DB directly.
// ---------------------------------------------------------------------------
async function dbOp(request: Request, env: Env): Promise<Response> {
  if (request.headers.get("X-Internal-Auth") !== env.INTERNAL_DB_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  const op = new URL(request.url).pathname.replace(/^\/__internal-db\//, "");
  const { args } = (await request.json()) as { args: any[] };
  const db = env.DB;

  try {
    switch (op) {
      // --- users ---------------------------------------------------------
      case "users.upsert": {
        const [id, email, name] = args;
        await db
          .prepare(
            `INSERT INTO users (id, email, name) VALUES (?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET email = excluded.email, name = excluded.name`
          )
          .bind(id, email, name)
          .run();
        return json(null);
      }
      case "users.get": {
        const [id] = args;
        const row = await db.prepare(`SELECT id, email, name FROM users WHERE id = ?`).bind(id).first();
        return json(row ?? null);
      }

      // --- google tokens ---------------------------------------------------
      case "tokens.save": {
        const [userId, t] = args;
        await db
          .prepare(
            `INSERT INTO google_tokens (user_id, access_token, refresh_token, scope, token_type, expiry_date, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
             ON CONFLICT(user_id) DO UPDATE SET
               access_token = excluded.access_token,
               refresh_token = COALESCE(excluded.refresh_token, google_tokens.refresh_token),
               scope = excluded.scope,
               token_type = excluded.token_type,
               expiry_date = excluded.expiry_date,
               updated_at = datetime('now')`
          )
          .bind(userId, t.accessToken, t.refreshToken, t.scope, t.tokenType, t.expiryDate)
          .run();
        return json(null);
      }
      case "tokens.get": {
        const [userId] = args;
        const row = await db
          .prepare(
            `SELECT access_token as accessToken, refresh_token as refreshToken, scope, token_type as tokenType, expiry_date as expiryDate
             FROM google_tokens WHERE user_id = ?`
          )
          .bind(userId)
          .first();
        return json(row ?? null);
      }
      case "tokens.clear": {
        const [userId] = args;
        await db.prepare(`DELETE FROM google_tokens WHERE user_id = ?`).bind(userId).run();
        return json(null);
      }

      // --- search history --------------------------------------------------
      case "history.add": {
        const [id, userId, query, queryType, resultCount, resultsSummary, openedFileId, openedFileName] = args;
        await db
          .prepare(
            `INSERT INTO search_history (id, user_id, query, query_type, result_count, results_summary, opened_file_id, opened_file_name)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(id, userId, query, queryType, resultCount, resultsSummary, openedFileId, openedFileName)
          .run();
        return json(null);
      }
      case "history.list": {
        const [userId, limit] = args;
        const { results } = await db
          .prepare(
            `SELECT id, query, query_type as queryType, created_at as createdAt, result_count as resultCount,
                    results_summary as resultsSummary, opened_file_id as openedFileId, opened_file_name as openedFileName
             FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
          )
          .bind(userId, limit)
          .all();
        return json(results);
      }
      case "history.listForDate": {
        const [userId, isoDate] = args;
        const { results } = await db
          .prepare(
            `SELECT id, query, query_type as queryType, created_at as createdAt, result_count as resultCount,
                    results_summary as resultsSummary, opened_file_id as openedFileId, opened_file_name as openedFileName
             FROM search_history WHERE user_id = ? AND date(created_at) = date(?) ORDER BY created_at DESC`
          )
          .bind(userId, isoDate)
          .all();
        return json(results);
      }
      case "history.remove": {
        const [userId, id] = args;
        await db.prepare(`DELETE FROM search_history WHERE user_id = ? AND id = ?`).bind(userId, id).run();
        return json(null);
      }
      case "history.clear": {
        const [userId] = args;
        await db.prepare(`DELETE FROM search_history WHERE user_id = ?`).bind(userId).run();
        return json(null);
      }

      // --- calendar / drive activity ---------------------------------------
      case "activity.add": {
        const [id, userId, action, query, fileId, fileName, folderId, folderName, metadata] = args;
        await db
          .prepare(
            `INSERT INTO calendar_activity (id, user_id, action, query, file_id, file_name, folder_id, folder_name, metadata)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(id, userId, action, query, fileId, fileName, folderId, folderName, metadata)
          .run();
        return json(null);
      }
      case "activity.listRange": {
        const [userId, start, end] = args;
        const { results } = await db
          .prepare(
            `SELECT id, user_id as userId, action, query, file_id as fileId, file_name as fileName,
                    folder_id as folderId, folder_name as folderName, metadata, timestamp
             FROM calendar_activity WHERE user_id = ? AND timestamp BETWEEN ? AND ? ORDER BY timestamp DESC`
          )
          .bind(userId, start, end)
          .all();
        return json(results);
      }

      // --- chat messages -----------------------------------------------------
      case "chat.add": {
        const [id, userId, conversationId, role, content, payload] = args;
        await db
          .prepare(`INSERT INTO chat_messages (id, user_id, conversation_id, role, content, payload) VALUES (?, ?, ?, ?, ?, ?)`)
          .bind(id, userId, conversationId, role, content, payload)
          .run();
        return json(null);
      }
      case "chat.list": {
        const [userId, conversationId] = args;
        const { results } = await db
          .prepare(
            `SELECT id, role, content, payload, created_at as createdAt FROM chat_messages
             WHERE user_id = ? AND conversation_id = ? ORDER BY created_at ASC`
          )
          .bind(userId, conversationId)
          .all();
        return json(results);
      }
      case "chat.clear": {
        const [userId, conversationId] = args;
        await db.prepare(`DELETE FROM chat_messages WHERE user_id = ? AND conversation_id = ?`).bind(userId, conversationId).run();
        return json(null);
      }

      // --- instagram tokens ----------------------------------------------
      case "instagramTokens.save": {
        const [userId, t] = args;
        await db
          .prepare(
            `INSERT INTO instagram_tokens (user_id, access_token, instagram_user_id, username, expiry_date, updated_at)
             VALUES (?, ?, ?, ?, ?, datetime('now'))
             ON CONFLICT(user_id) DO UPDATE SET
               access_token = excluded.access_token,
               instagram_user_id = excluded.instagram_user_id,
               username = excluded.username,
               expiry_date = excluded.expiry_date,
               updated_at = datetime('now')`
          )
          .bind(userId, t.accessToken, t.instagramUserId, t.username, t.expiryDate)
          .run();
        return json(null);
      }
      case "instagramTokens.get": {
        const [userId] = args;
        const row = await db
          .prepare(
            `SELECT access_token as accessToken, instagram_user_id as instagramUserId, username, expiry_date as expiryDate
             FROM instagram_tokens WHERE user_id = ?`
          )
          .bind(userId)
          .first();
        return json(row ?? null);
      }
      case "instagramTokens.clear": {
        const [userId] = args;
        await db.prepare(`DELETE FROM instagram_tokens WHERE user_id = ?`).bind(userId).run();
        return json(null);
      }

      // --- agent activity (Google/YouTube/Instagram usage log) -----------
      case "agentActivity.add": {
        const [id, userId, agent, action, topic, resultCount] = args;
        await db
          .prepare(`INSERT INTO agent_activity (id, user_id, agent, action, topic, result_count) VALUES (?, ?, ?, ?, ?, ?)`)
          .bind(id, userId, agent, action, topic, resultCount)
          .run();
        return json(null);
      }
      case "agentActivity.topicCounts": {
        const [userId, agent, sinceModifier] = args;
        const { results } = await db
          .prepare(
            `SELECT topic, SUM(result_count) as count FROM agent_activity
             WHERE user_id = ? AND agent = ? AND timestamp >= datetime('now', ?)
             GROUP BY topic ORDER BY count DESC LIMIT 12`
          )
          .bind(userId, agent, sinceModifier)
          .all();
        return json(results);
      }
      case "agentActivity.listRecent": {
        const [userId, agent, limit] = args;
        const { results } = await db
          .prepare(
            `SELECT id, agent, action, topic, result_count as resultCount, timestamp
             FROM agent_activity WHERE user_id = ? AND agent = ? ORDER BY timestamp DESC LIMIT ?`
          )
          .bind(userId, agent, limit)
          .all();
        return json(results);
      }
      case "agentActivity.listRange": {
        const [userId, agent, start, end] = args;
        const { results } = await db
          .prepare(
            `SELECT id, agent, action, topic, result_count as resultCount, timestamp
             FROM agent_activity WHERE user_id = ? AND agent = ? AND timestamp BETWEEN ? AND ?
             ORDER BY timestamp DESC`
          )
          .bind(userId, agent, start, end)
          .all();
        return json(results);
      }

      default:
        return new Response(`Unknown op: ${op}`, { status: 404 });
    }
  } catch (err: any) {
    console.error(`[dbOp:${op}]`, err);
    return new Response(err?.message ?? "DB_OP_FAILED", { status: 500 });
  }
}

function json(data: unknown): Response {
  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
}

// ---------------------------------------------------------------------------
// The container itself: Node backend (port 4000) + Python chart service
// (port 5001, same image, see ../Dockerfile) running together.
// ---------------------------------------------------------------------------
export class AppContainer extends Container<Env> {
  defaultPort = 4000;
  sleepAfter = "15m";

  envVars: Record<string, string>;

  constructor(ctx: DurableObject<Env>["ctx"], env: Env) {
    super(ctx, env);
    this.envVars = {
      NODE_ENV: "production",
      PORT: "4000",
      FRONTEND_URL: env.FRONTEND_URL,
      SESSION_SECRET: env.SESSION_SECRET,
      OPENAI_API_KEY: env.OPENAI_API_KEY,
      OPENAI_MODEL: env.OPENAI_MODEL,
      GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI: env.GOOGLE_REDIRECT_URI,
      WEB_SEARCH_PROVIDER: env.WEB_SEARCH_PROVIDER,
      SEARCH_API_KEY: env.SEARCH_API_KEY,
      YOUTUBE_API_KEY: env.YOUTUBE_API_KEY,
      INSTAGRAM_APP_ID: env.INSTAGRAM_APP_ID,
      INSTAGRAM_APP_SECRET: env.INSTAGRAM_APP_SECRET,
      INSTAGRAM_REDIRECT_URI: env.INSTAGRAM_REDIRECT_URI,
      CHART_SERVICE_URL: "http://localhost:5001",
      INTERNAL_DB_SECRET: env.INTERNAL_DB_SECRET,
      // The container has no direct binding access (D1, KV, etc. only exist
      // inside the Worker runtime) — it reaches the DB by making a real
      // HTTPS request back to this same Worker's own public domain, which
      // the fetch handler below intercepts at /__internal-db/* and answers
      // with dbOp() instead of forwarding to the container.
      INTERNAL_DB_URL: `${env.FRONTEND_URL}/__internal-db`,
    };
    // Containers have no outbound network access by default — required for
    // the INTERNAL_DB_URL call above to leave the container at all.
    this.enableInternet = true;
  }

  override onStart() {
    console.log("[AppContainer] started");
  }
  override onStop() {
    console.log("[AppContainer] stopped");
  }
  override onError(error: unknown) {
    console.error("[AppContainer] error", error);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Internal-only: the container calls back here for every database
    // operation (see backend/src/database/dbClient.ts). Never forwarded to
    // the container itself, and gated by the X-Internal-Auth shared secret
    // inside dbOp() — this path is public on the domain but useless without
    // that header.
    if (url.pathname.startsWith("/__internal-db/")) {
      return dbOp(request, env);
    }

    // Everything else: one sticky container instance for the whole app
    // (single-tenant deploy).
    const container = getContainer(env.APP_CONTAINER, "primary");
    return container.fetch(request);
  },
};
