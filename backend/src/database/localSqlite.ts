import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { env } from "../config/env";

// Uses Node's built-in node:sqlite (stable since Node 22.5) so there is no
// native-module build step (node-gyp/Visual Studio) required on any platform.
// Swap this file for a PostgreSQL/Supabase client later without touching
// the repositories in ./repositories.ts, which only depend on the small
// prepare/run/get/all surface used below.
const dbPath = path.resolve(process.cwd(), env.databaseUrl);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL;");

db.exec(`
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
`);
