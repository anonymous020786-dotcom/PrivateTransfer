# Deploy Zync on a Hostinger VPS (videodownloaders.cloud)

A complete, copy-paste runbook for a Hostinger KVM VPS (Ubuntu 22/24) with a
domain. Result: the whole app live on **one domain with automatic HTTPS**, your
**own PeerJS signaling**, Redis, and free TURN — no extra services.

> Recommended VPS template: **Ubuntu 24.04 with Docker** (Hostinger offers a
> one-click "Ubuntu + Docker" image — pick it when creating/rebuilding the VPS).

---

## Step 1 — Point the domain at the VPS (DNS)

In hPanel → **Domains → DNS / Nameservers** for `videodownloaders.cloud`, create:

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | `YOUR_VPS_IPv4` |
| A | `www` | `YOUR_VPS_IPv4` |

Find the VPS IP in hPanel → **VPS → your server**. DNS takes a few minutes to
propagate. Check: `ping videodownloaders.cloud` should return the VPS IP.

## Step 2 — SSH into the VPS

From your Windows machine (PowerShell):

```powershell
ssh root@YOUR_VPS_IPv4
```

(Use the root password / SSH key you set in hPanel.)

## Step 3 — Install Docker (skip if your image already has it)

```bash
curl -fsSL https://get.docker.com | sh
docker --version && docker compose version
```

## Step 4 — Open the firewall

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

> If you later self-host coturn, also open `3478`, `5349` and the UDP relay
> range — see [`deploy/oracle/`](../deploy/oracle/). Not needed for the default
> (free TURN) setup.

## Step 5 — Get the code

```bash
git clone https://github.com/zestcommerce841428-png/zync.git
cd zync
```

## Step 6 — Configure environment

```bash
cp deploy/vps/.env.example deploy/vps/.env
# Generate a session secret and paste it into the file:
openssl rand -hex 32
nano deploy/vps/.env     # set FILEPIZZA_SECRET + any optional keys
```

Required values are already pre-filled for `videodownloaders.cloud`. At minimum
set `FILEPIZZA_SECRET`. Supabase / SMTP / analytics are optional.

## Step 7 — Build & launch (pick a web server)

**Option A — NGINX (recommended):** Nginx serves the site via `nginx-proxy`,
with `acme-companion` issuing/renewing Let's Encrypt certs automatically.

```bash
docker compose --env-file deploy/vps/.env -f deploy/vps/docker-compose.nginx.yml up -d --build
```

**Option B — Caddy:**

```bash
docker compose --env-file deploy/vps/.env -f deploy/vps/docker-compose.yml up -d --build
```

**Option C — Host-installed Nginx (run nginx directly, not in a container):**
start only the app + peerjs + redis, then use the classic server block at
[`deploy/vps/nginx/videodownloaders.cloud.conf`](../deploy/vps/nginx/videodownloaders.cloud.conf)
with `certbot` (instructions in that file's header).

First build takes a few minutes; the certificate is issued automatically once
DNS resolves and ports 80/443 are open. Then visit:

**https://videodownloaders.cloud** 🎉

Check logs / status (swap the `-f` file for the compose you launched):

```bash
docker compose -f deploy/vps/docker-compose.nginx.yml ps
docker compose -f deploy/vps/docker-compose.nginx.yml logs -f nginx-proxy acme
```

---

## Updating to the latest version

```bash
cd ~/zync && git pull
docker compose --env-file deploy/vps/.env -f deploy/vps/docker-compose.yml up -d --build
```

## Common operations

```bash
# Stop / start
docker compose -f deploy/vps/docker-compose.yml down
docker compose --env-file deploy/vps/.env -f deploy/vps/docker-compose.yml up -d

# App logs
docker compose -f deploy/vps/docker-compose.yml logs -f app
```

## Troubleshooting

- **Cert not issued / site not loading:** confirm DNS A record points at the VPS
  and ports 80/443 are open (`ufw status`). Caddy needs port 80 reachable to
  validate. Watch `docker compose ... logs -f caddy`.
- **Sign-in button missing:** Supabase keys not set — add the
  `NEXT_PUBLIC_SUPABASE_*` values to `.env` and rebuild (they bake in at build).
- **Transfers fail behind strict NAT:** the default free Open Relay TURN covers
  most cases; for guaranteed relay self-host coturn (see `deploy/oracle/`).

## What's running

| Container | Role | Exposed |
| --- | --- | --- |
| `caddy` | TLS + reverse proxy | 80, 443 (public) |
| `app` | Next.js (Zync) | internal :3000 |
| `peerjs` | WebRTC signaling | internal :9000 (proxied at `/peerjs`) |
| `redis` | stats / presence / sessions | internal :6379 |

With 4 vCPU / 16 GB RAM this comfortably handles the app plus room to add coturn
later. File bytes still travel peer-to-peer — the VPS only does signaling,
presence and HTTPS.
