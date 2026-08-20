-- D1 schema — mirrors backend/src/database/db.ts exactly (D1 is SQLite,
-- same dialect as the node:sqlite version this replaces for the Cloudflare
-- deployment path). Apply with:
--   wrangler d1 execute filemindai-db --file=./worker/schema.sql --remote

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS google_tokens (
  user_id TEXT PRIMARY KEY,
  access_token TEXT,
  refresh_token TEXT,
  scope TEXT,
  token_type TEXT,
  expiry_date INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS search_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  query TEXT NOT NULL,
  query_type TEXT NOT NULL,
  result_count INTEGER NOT NULL DEFAULT 0,
  results_summary TEXT,
  opened_file_id TEXT,
  opened_file_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS calendar_activity (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  query TEXT,
  file_id TEXT,
  file_name TEXT,
  folder_id TEXT,
  folder_name TEXT,
  metadata TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  payload TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agent_activity (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  agent TEXT NOT NULL,
  action TEXT NOT NULL,
  topic TEXT NOT NULL,
  result_count INTEGER NOT NULL DEFAULT 0,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS instagram_tokens (
  user_id TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  instagram_user_id TEXT NOT NULL,
  username TEXT,
  expiry_date INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_history_user_created ON search_history(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_user_ts ON calendar_activity(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_chat_conv ON chat_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_activity_user_agent_ts ON agent_activity(user_id, agent, timestamp);
