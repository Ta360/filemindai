# Deploying to filemindai.org

This runbook deploys the app (backend + built frontend + Matplotlib chart
service) to your own VPS via Docker, fronted by nginx for TLS. Run every
command below yourself over SSH — secrets and server access stay on your
side throughout.

## 0. Prerequisites

- A VPS running Ubuntu 22.04+ (or similar), with a public IP, and root/sudo
  SSH access.
- `filemindai.org` registered and you can edit its DNS.

## 1. Point DNS at the server

In your domain's DNS panel, add:

| Type | Name | Value             |
|------|------|--------------------|
| A    | @    | `<your VPS public IP>` |
| A    | www  | `<your VPS public IP>` |

DNS propagation can take a few minutes to a few hours. You can move on while
it propagates, but certbot (step 5) will fail until it's resolved correctly —
check with `dig filemindai.org` or `nslookup filemindai.org` from your own
machine before running that step.

## 2. Install Docker, Docker Compose, nginx, and certbot on the VPS

```bash
ssh youruser@<vps-ip>

sudo apt update
sudo apt install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx
sudo systemctl enable --now docker
```

## 3. Get the code onto the server

```bash
# either clone your git remote:
git clone <your-repo-url> filemindai
cd filemindai

# or scp the folder up from your machine instead of git:
#   scp -r "Gogle Drive LLM" youruser@<vps-ip>:~/filemindai
```

## 4. Create the production secrets file

**On the VPS**, not on your local machine and not in this chat:

```bash
cp backend/.env.production.example backend/.env
nano backend/.env   # fill in every blank value
```

You'll need:
- `SESSION_SECRET` — generate with `openssl rand -hex 32`
- `OPENAI_API_KEY`, `SEARCH_API_KEY`, `YOUTUBE_API_KEY` — can reuse your dev
  keys, or create fresh production ones
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — **create a new OAuth client**
  in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
  (or add a second redirect URI to your existing one) with:
  - Authorized JavaScript origin: `https://filemindai.org`
  - Authorized redirect URI: `https://filemindai.org/api/auth/callback`
- `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET` — add
  `https://filemindai.org/api/agents/instagram/callback` as a valid OAuth
  redirect URI in your Meta Developer app settings

## 5. Get a TLS certificate

Install the nginx site config first (HTTP-only — certbot upgrades it):

```bash
sudo cp deploy/nginx.filemindai.org.conf /etc/nginx/sites-available/filemindai.org
sudo ln -s /etc/nginx/sites-available/filemindai.org /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d filemindai.org -d www.filemindai.org
```

Certbot edits the nginx config in place to add the HTTPS server block and
sets up automatic renewal. Confirm renewal works with:

```bash
sudo certbot renew --dry-run
```

## 6. Build and start the app

```bash
cd ~/filemindai
docker compose -f docker-compose.prod.yml up -d --build
```

This builds two containers:
- `app` — backend + built frontend, bound to `127.0.0.1:4000` (only nginx can
  reach it directly)
- `charts` — the Matplotlib chart microservice, internal-only

Check they're healthy:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app
curl -s http://127.0.0.1:4000/api/health
```

## 7. Verify

Visit `https://filemindai.org` in a browser. You should land on the new
Login page. Sign in with Google, then try each AI agent page to confirm the
YouTube/Serper/Instagram keys carried over correctly.

## Updating after a code change

```bash
cd ~/filemindai
git pull   # or re-upload changed files
docker compose -f docker-compose.prod.yml up -d --build
```

The SQLite database persists across rebuilds in the `app-data` Docker
volume, so search history/activity charts aren't lost on redeploy.

## Notes

- The chart service and database are **not** exposed to the internet —
  only nginx (443) and SSH are open. Consider `sudo ufw allow 22,80,443/tcp`
  + `sudo ufw enable` if the VPS doesn't already have a firewall configured.
- Rotate `SESSION_SECRET` only if you're OK invalidating all logged-in
  sessions — everyone would need to sign in again.
- If you ever need to roll back, `docker compose -f docker-compose.prod.yml
  down` stops both containers without touching the persisted database volume.
