# Deploying to filemindai.org via Cloudflare Containers + D1

This is the Cloudflare-native alternative to `DEPLOY.md` (the VPS path) — no
server to SSH into, but the app's database layer runs on D1 instead of
SQLite, and the Node backend + Python chart service are merged into one
container image (see `Dockerfile.cloudflare` and `start.cloudflare.sh`).

Run every command yourself; secrets never get typed into chat.

## 0. Prerequisites

- **Docker Desktop installed and running locally** — `wrangler deploy`
  builds the container image on your machine before pushing it.
- Node.js installed locally.
- filemindai.org already registered on Cloudflare (it is — you already have
  this).

## 1. Install the Worker's dependencies and log in

```bash
cd worker
npm install
npx wrangler login
```

This opens a browser window to authorize Wrangler against your Cloudflare
account.

## 2. Create the D1 database

```bash
npx wrangler d1 create filemindai-db
```

This prints a `database_id`. Open `worker/wrangler.jsonc` and paste it in,
replacing `REPLACE_WITH_YOUR_D1_DATABASE_ID`.

## 3. Apply the schema

```bash
npx wrangler d1 execute filemindai-db --remote --file=./schema.sql
```

## 4. Set secrets

Each of these prompts you to paste the value — nothing is stored in a file:

```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put INTERNAL_DB_SECRET
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put SEARCH_API_KEY
npx wrangler secret put YOUTUBE_API_KEY
npx wrangler secret put INSTAGRAM_APP_ID
npx wrangler secret put INSTAGRAM_APP_SECRET
```

For `SESSION_SECRET` and `INTERNAL_DB_SECRET`, generate a random value first
(e.g. `openssl rand -hex 32` in a separate terminal) and paste that in —
`INTERNAL_DB_SECRET` in particular is what authenticates the container's
callback requests to the Worker's D1 API (see `worker/src/index.ts` and
`backend/src/database/dbClient.ts`), so it must be a real secret, not
something guessable.

If you already set up a Google OAuth client or Instagram app for the VPS
deployment path pointing at `https://filemindai.org/...`, you can reuse the
exact same `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` and Instagram
credentials here — the redirect URIs are identical either way, since both
paths serve the same domain.

## 5. Deploy

```bash
npx wrangler deploy
```

This builds the container image from `Dockerfile.cloudflare` (Docker must be
running), pushes it to Cloudflare's registry, and wires up the Worker, D1
binding, and the `filemindai.org` custom domain route. First deploy can take
a few minutes before the container is actually reachable.

## 6. Verify

Visit `https://filemindai.org`. You should land on the Login page. Sign in
with Google, then try each AI agent page.

## If the build fails on a "file not found" / COPY error

One part of this setup I couldn't verify against a real deploy (no
Cloudflare account access on my end): whether `wrangler`'s Docker build uses
the *Dockerfile's own directory* as the build context, or something else.
`worker/wrangler.jsonc` assumes the former, which is why `Dockerfile.cloudflare`
sits at the repo root (so its build context naturally includes `backend/`,
`frontend/`, `shared/`, and `charts-service/`, all needed by its `COPY`
lines). If `wrangler deploy` fails specifically while building the image and
complains about a missing source path, that assumption was wrong — check
`npx wrangler deploy --help` or the current
[Containers image management docs](https://developers.cloudflare.com/containers/platform-details/image-management/)
for how to set an explicit build context, or tell me the exact error and
I'll adjust.

## Updating after a code change

```bash
cd worker
npx wrangler deploy
```

That's it — no separate DNS/nginx/certbot steps like the VPS path, since
Cloudflare already owns the domain and handles TLS automatically for
Workers custom domains.

## Rolling back

```bash
npx wrangler deployments list
npx wrangler rollback <deployment-id>
```

## Notes

- `INTERNAL_DB_SECRET` and `INTERNAL_DB_URL` only exist in this deployment
  path — locally and on the VPS path, the backend talks to SQLite directly
  and neither variable is set (see `isCloudflareMode` in
  `backend/src/config/env.ts`).
- The chart service's data source, D1 schema, and every route/behavior are
  identical to the VPS deployment — only the storage/transport layer
  differs.
- GitHub Actions auto-deploy (`.github/workflows/deploy.yml`) currently
  targets the VPS path via SSH. A Cloudflare version would use
  `wrangler deploy` with a `CLOUDFLARE_API_TOKEN` repo secret instead — say
  the word if you want that added once this manual deploy is confirmed
  working.
