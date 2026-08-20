# Google Drive LLM AI Assistant

A production-quality full-stack dashboard that lets you search, open, and analyze your Google Drive with natural
language, backed by an OpenAI-powered assistant, live web search, and real-time analytics/calendar/history views.

> "ChatGPT + Google Drive + Google Search + File Explorer + Analytics Dashboard" — in one app.

---

## 1. Project Overview

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS — a SaaS-style dashboard (chat, file/folder browser,
  image preview, video player, live charts, calendar, search history).
- **Backend**: Node.js + TypeScript + Express — Google OAuth, Drive API, OpenAI tool-calling, web search
  abstraction, analytics, and a SQLite-backed activity/history store.
- **AI**: OpenAI Chat Completions with function/tool calling. The model never invents file IDs or URLs — every
  file/folder/web result shown to the user comes from a real tool call to Google Drive or a web search provider.
- **No mock data in production flow**: once Google Drive/OpenAI/web search are configured, every result in the
  dashboard is sourced live from those APIs or from the local activity database.

## 2. Architecture

```
frontend/        React + TS + Vite + Tailwind dashboard (chat, file browser, charts, calendar, AI agents)
backend/         Node + TS + Express API (auth, Drive, AI, web search, analytics, history, calendar, AI agents)
shared/          Shared TypeScript type contracts used by both frontend and backend
charts-service/  Python + Flask + Matplotlib microservice rendering real daily usage bar/pie charts
```

Backend layout:

```
backend/src/
  config/            env loading + feature-flag helpers (isGoogleConfigured, isOpenAIConfigured, ...)
  database/          SQLite (node:sqlite) schema + repositories (users, tokens, history, activity, chat)
  middleware/         auth (signed session cookie) + centralized error handler
  services/
    googleDrive/      OAuth flow + Drive search/metadata/streaming
    webSearch/         provider-agnostic WebSearchService (Serper / Tavily / none)
    ai/                query router, OpenAI tool definitions, AIService orchestration
    analytics/          normalizes real Drive results into chart-ready data
    agents/             Google/YouTube/Instagram agent services + Matplotlib chart client
  routes/             one file per resource, thin controllers using the services above
                      (agentRoutes.ts covers all three AI agents)
  server.ts           Express app wiring
```

Frontend layout:

```
frontend/src/
  components/        FileCard, FolderCard, ImagePreviewPanel, VideoPlayerPanel, ChartPanel,
                      CalendarWidget, FileDetailsDrawer, chat/ChatWindow, chat/MessageBubble, ...
  pages/              Dashboard, Assistant, Files, Folders, Images, Videos, History, Analytics,
                      Calendar, Settings
  hooks/              useDashboardStore (central state: chat, current results, previews, charts)
  services/api.ts     typed fetch wrapper for every backend endpoint
  types/               re-exports shared/types
```

### Data flow (why the dashboard feels "live")

`useDashboardStore` is a single React context that owns: chat messages, the current Drive search results, the
selected image/video, and the current chart data. Every AI chat response updates all of these at once, so asking
"find my marketing files" then "show me files by type" then "open the image" flows through one consistent state —
matching the "real-time data synchronization" behavior requested in the spec.

## 3. Prerequisites

- Node.js **v22.5+** (the backend uses the built-in `node:sqlite` module — no native build tools required)
- An OpenAI API key
- A Google Cloud project with the Drive API enabled
- (Optional) A web search API key — Serper.dev or Tavily

## 4. Google Cloud Setup (Google Drive API + OAuth)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a new project (or select an existing
   one).
2. **Enable the Drive API**: APIs & Services → Library → search "Google Drive API" → Enable.
3. **Configure the OAuth consent screen**: APIs & Services → OAuth consent screen.
   - User type: External (or Internal if using Google Workspace).
   - Fill in app name, support email, developer contact.
   - Scopes: add `.../auth/drive.readonly`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` (these are the
     only scopes this app requests — read-only Drive access plus basic profile identification).
   - Add your own Google account under "Test users" while the app is in testing mode.
4. **Create OAuth credentials**: APIs & Services → Credentials → Create Credentials → OAuth client ID.
   - Application type: **Web application**.
   - Authorized JavaScript origins: `http://localhost:5173`
   - Authorized redirect URIs: `http://localhost:4000/api/auth/callback`
   - Save the generated **Client ID** and **Client Secret**.
5. **Test OAuth**: start the backend and frontend (see below), click "Connect Google Drive" in the header, sign in,
   and approve the consent screen. You should be redirected back with "Google Drive: Connected".

Do not request broader scopes than `drive.readonly`. Never hard-code the client ID/secret — they belong in `.env`.

## 5. OpenAI Configuration

1. Create an API key at [platform.openai.com](https://platform.openai.com/api-keys).
2. Set `OPENAI_API_KEY` in `backend/.env`.
3. `OPENAI_MODEL` controls which model is used (default `gpt-4o-mini`) — change it without any code changes.

## 6. Web Search Configuration (optional but recommended)

The backend never fabricates "current" information — if you don't configure a web search provider, general-knowledge
questions will return a clear "Web search is temporarily unavailable" message instead of a fabricated answer.

Supported providers (set `WEB_SEARCH_PROVIDER` in `backend/.env`):

- `serper` — [serper.dev](https://serper.dev) (Google Search API wrapper). Set `SEARCH_API_KEY` to your Serper key.
- `tavily` — [tavily.com](https://tavily.com) (AI-oriented search with content + images). Set `SEARCH_API_KEY` to
  your Tavily key.
- `none` — disables web search (default).

Adding a new provider only requires implementing the `WebSearchProvider` interface in
`backend/src/services/webSearch/webSearchService.ts`.

## 6a. AI Agents Setup (Google / YouTube / Instagram)

Three additional agents live in the sidebar under "AI Agents", each backed by real APIs — no mock data:

- **Google Agent** (`/agents/google`) — reuses the `WebSearchService` configured in section 6 plus OpenAI to answer
  any question with a live, cited, few-second summary. No extra keys needed beyond sections 5 and 6.
- **YouTube Agent** (`/agents/youtube`) — searches YouTube by channel, person, or topic via the YouTube Data API v3,
  and plays results in an app-wide floating player (minimize/maximize, bottom-right) so you never leave the
  dashboard. Requires `YOUTUBE_API_KEY`:
  1. In [Google Cloud Console](https://console.cloud.google.com/apis/library/youtube.googleapis.com), enable the
     "YouTube Data API v3" (can be the same project as Drive).
  2. Create an API key (APIs & Services → Credentials → Create Credentials → API key) and paste it into
     `backend/.env` as `YOUTUBE_API_KEY`.
- **Instagram Agent** (`/agents/instagram`) — connects **your own** Instagram Business/Creator account via OAuth and
  shows your own recent media, with in-app image/video preview (no redirect to instagram.com). By design it cannot
  browse another person's photos by username — Instagram has no supported public API for that, and building one
  would mean scraping and enabling non-consensual surveillance of third parties. Requires:
  1. A Meta Developer app at [developers.facebook.com/apps](https://developers.facebook.com/apps) with the
     "Instagram" product added (Instagram API with Instagram Login).
  2. `INSTAGRAM_APP_ID` and `INSTAGRAM_APP_SECRET` in `backend/.env`.
  3. `INSTAGRAM_REDIRECT_URI` registered in the app's valid OAuth redirect URIs
     (`http://localhost:4000/api/agents/instagram/callback` in development).

### Daily usage charts (Matplotlib)

Every agent page shows two real charts — **bar** (topic/channel/person on the x-axis, searches or videos viewed on
the y-axis) and **pie** (share of activity by topic) — rendered by a small Python/Flask + Matplotlib microservice
in `charts-service/`, reading only your real logged searches (`agent_activity` table). Run it alongside the backend:

```bash
cd charts-service
pip install -r requirements.txt
python app.py          # listens on http://localhost:5001
```

Set `CHART_SERVICE_URL` in `backend/.env` if you run it on a different host/port. If the chart service isn't
running, each agent page shows a clear "chart service unavailable" message instead of a broken image.

## 7. Environment Variables

Copy the example files and fill in real values — **never commit `.env`**.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

`backend/.env`:

```env
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=replace_with_a_long_random_string

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/callback

WEB_SEARCH_PROVIDER=none
SEARCH_API_KEY=

DATABASE_URL=./data/app.db

YOUTUBE_API_KEY=
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
INSTAGRAM_REDIRECT_URI=http://localhost:4000/api/agents/instagram/callback
CHART_SERVICE_URL=http://localhost:5001
```

`frontend/.env`:

```env
VITE_API_BASE_URL=/api
```

## 8. Database Setup

The backend uses **SQLite via Node's built-in `node:sqlite` module** — there is nothing to install and no native
build step. On first run it creates `backend/data/app.db` and the required tables automatically.

The database layer is intentionally modular (`backend/src/database/db.ts` + `repositories.ts`) so it can be swapped
for PostgreSQL/Supabase later: only those two files talk to SQL directly, every route/service goes through the
repository functions.

## 9. Installation

```bash
# from the project root
cd backend && npm install
cd ../frontend && npm install
```

## 10. Development

Run both servers (two terminals):

```bash
cd backend && npm run dev      # http://localhost:4000
cd frontend && npm run dev     # http://localhost:5173
```

Open `http://localhost:5173`. Click **Connect Google Drive** to authorize, then try:

- `/folders`
- "Find my resume"
- "Show me files by type"
- "What's the latest AI news?" (requires a web search provider)

## 11. Production Build

```bash
cd backend && npm run build && npm start
cd frontend && npm run build   # outputs static assets to frontend/dist — serve with any static host / CDN
```

In production, set `NODE_ENV=production`, use HTTPS redirect URIs in Google Cloud, and point `FRONTEND_URL` /
`GOOGLE_REDIRECT_URI` at your real domains.

For a full deploy to filemindai.org, see **[DEPLOY.md](DEPLOY.md)** (Docker + nginx on your own VPS — SQLite
persists directly) or **[CLOUDFLARE_DEPLOY.md](CLOUDFLARE_DEPLOY.md)** (Cloudflare Containers + D1 — no server to
manage, but the database layer runs over D1 instead of local SQLite).

## 12. Testing

```bash
cd backend && npm test    # vitest: query router, analytics normalization, error-message sanitization
cd frontend && npm test   # vitest: formatting utilities
```

## 13. Security Considerations / Checklist

- [x] OpenAI key, Google client secret, and search API key live only in `backend/.env`, never sent to the browser.
- [x] Google OAuth requests only `drive.readonly` + basic profile scopes — no write access, no broader scopes.
- [x] Session is a signed, `httpOnly`, `SameSite=Lax` cookie (HMAC-SHA256 with `SESSION_SECRET`) — not a JWT with
      user-controlled claims.
- [x] Private Drive files are **never made public**: previews/downloads are streamed through the backend using the
      signed-in user's own OAuth token (`/api/drive/file/:id/preview` and `/download`), never via a public link.
- [x] All error responses are mapped through `toSafeError()` to user-safe messages — stack traces and raw
      provider errors are never returned to the client, only logged server-side.
- [x] Rate limiting (`express-rate-limit`) is applied to all `/api` routes.
- [x] `.env` is git-ignored; `.env.example` files contain placeholders only.
- [x] CORS is locked to `FRONTEND_URL` with credentials.
- Before going to production: rotate `SESSION_SECRET`, move the OAuth consent screen out of "Testing" mode (Google
  review may be required for `drive.readonly`), and put the SQLite file (or its Postgres replacement) on encrypted
  storage with backups.

## 14. Known Limitations

- **Video seeking**: playback is proxied through the backend with `Range` header pass-through, but full scrubbing
  reliability depends on how the Drive API responds to range requests for a given file; if playback fails, the UI
  falls back to "Open Video in Google Drive".
- **SVG/HEIC preview**: browsers render SVG and most raster formats fine; some Drive-native/HEIC formats may not
  render inline — the Image Preview panel falls back to "Open in Google Drive" automatically in that case.
- **Web search image results**: image availability depends entirely on the configured provider (Serper/Tavily);
  with `WEB_SEARCH_PROVIDER=none`, general-knowledge questions return a clear "not configured" message rather than
  a hallucinated answer.
- **Folder child counts**: the Drive API doesn't cheaply expose a folder's child count without a second query per
  folder, so `childCount` is currently left null in list views (avoids N+1 API calls against Drive's rate limits).
- **Single-user session model**: the OAuth session is a simple signed cookie per browser session; there's no
  multi-account switcher yet (disconnect + reconnect to switch Google accounts).

## 15. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "Google Drive integration is not configured" | Missing `GOOGLE_CLIENT_ID`/`SECRET` | Fill in `backend/.env` |
| OAuth redirects to `driveError=invalid_state` | Stale/blocked cookies, or redirect URI mismatch | Confirm `GOOGLE_REDIRECT_URI` matches the Google Cloud console exactly |
| "AI service is temporarily unavailable" | Missing/invalid `OPENAI_API_KEY`, or OpenAI rate limit | Check the key and `OPENAI_MODEL` |
| "Web search is temporarily unavailable" | `WEB_SEARCH_PROVIDER=none` or missing `SEARCH_API_KEY` | Configure a provider in `.env` |
| Video won't play, only "Open in Google Drive" shows | File isn't MP4/WebM, or the browser can't decode the codec | Expected fallback — open in Drive |
| `EADDRINUSE` on port 4000/5173 | Another process is already running | Stop it or change `PORT`/Vite port |

---

Built as a real, scalable AI SaaS foundation: security → correct API integration → reliable AI routing → real
Google Drive data → UX → analytics → performance.
