<div align="center">

# ⚡ Zync — Private File Transfer & Tools Platform

**Zync** is a full-featured, production-ready file-transfer and browser-tools platform.  
It combines **peer-to-peer WebRTC transfers** (no server, no size limit) with a **WeTransfer Pro-style cloud transfer system** (Cloudflare R2 or AWS S3, up to **200 GB**, up to **1 year** link lifetime), 15 in-browser tools, a 140-article blog, full accounts, and a deep accessibility suite — all in one Next.js app.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/zestcommerce841428-png/zync)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/zestcommerce841428-png/zync)
![Docker build](https://github.com/zestcommerce841428-png/zync/actions/workflows/docker.yml/badge.svg)

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-149eca?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)
![Material UI](https://img.shields.io/badge/MUI-v9-007fff?logo=mui)
![Cloudflare R2](https://img.shields.io/badge/Cloudflare-R2-f38020?logo=cloudflare)
![AWS S3](https://img.shields.io/badge/AWS-S3-ff9900?logo=amazons3)
![Redis](https://img.shields.io/badge/Redis-7-dc382d?logo=redis)
![Supabase](https://img.shields.io/badge/Supabase-auth-3ecf8e?logo=supabase)
![License](https://img.shields.io/badge/license-BSD--3--Clause-blue)

> Built by **Naushad Alam** · engineered with **Claude** · operated under ZestCommerce.

</div>

---

## 📑 Table of contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Storage & cleanup approach](#-storage--cleanup-approach)
- [Admin settings panel](#-admin-settings-panel)
- [Security](#-security)
- [Quick start](#-quick-start)
- [Deploy](#-deploy)
- [Configuration](#️-configuration)
- [Tech stack](#-tech-stack)
- [Scripts](#-scripts)
- [Contact](#-contact)
- [License](#-license)

---

## ✨ Features

### 🚀 Cloud file transfer (WeTransfer Pro-style)
| Feature | Detail |
|---|---|
| **Upload & share link** | Drag-drop or folder upload up to **200 GB**, up to 20 files |
| **Folder upload** | Drag an entire folder — flattened via FileSystem API |
| **Long-lived links** | Up to **1 year** for signed-in users · 7 days for guests |
| **Recipient email** | Send link directly to recipient emails — notified on upload complete |
| **Download alert** | Email to sender on first download (opt-in per transfer) |
| **Password protection** | SHA-256 hashed, rate-limited verify endpoint |
| **Download limit cap** | Set max downloads per link |
| **Burn after read** | R2/S3 objects deleted 30 s after first download |
| **Auto cleanup** | Expired transfers batch-deleted every 5 min via cron container |
| **Transfer history** | Per-user history with copy/delete/open — auth-gated |
| **Image / video / PDF preview** | Inline presigned preview — no download required |
| **Download all as ZIP** | Client-side ZIP built with fflate — no server involved |
| **Upload speed & ETA** | Real-time MB/s + time remaining via 3-second sliding window |
| **Custom backgrounds** | Per-transfer background presets on the share page |
| **Social share** | WhatsApp · Telegram · X/Twitter · Email · Web Share API |
| **QR code** | Auto-generated on the share screen |
| **Zero egress cost (R2)** | Presigned URLs — file bytes bypass the VPS entirely |
| **S3 cost savings** | Intelligent-Tiering · Standard-IA · Glacier IR (up to 68% cheaper) |

### 🔄 Peer-to-peer transfer (WebRTC)
- True **browser-to-browser** transfer via WebRTC DataChannels (PeerJS)
- **End-to-end encrypted** by default (DTLS) — server sees zero bytes
- **No size limit** — backpressure streaming, streamed straight to disk
- Live **presence** (SSE), **resumable** transfers, download caps
- QR code + short link — multiple recipients from one sender room

### 🔧 15 in-browser tools
Image compression, PDF tools, text utilities, video tools — all client-side, nothing uploaded.

### 🌐 Site & platform
- Professional **landing page**, blog (140+ articles), About, Contact, compliance pages
- **Supabase** auth — Google OAuth, magic link, TOTP 2FA, profile + avatar
- **Admin panel** at `/admin` with stats, blog manager, and **runtime settings**
- **Runtime settings panel** — change SMTP, R2/S3 credentials, and feature flags from the UI without touching the VPS
- **Feature flags** — toggle email notifications, transfer tracking, reCAPTCHA, guest uploads, and new registration on/off at runtime
- **Advanced personalization**: 13 accent colors, 6 fonts, 8 theme presets, density, radius, text scaling, RTL
- **Deep accessibility suite**: high contrast, grayscale, reduced motion, dyslexia spacing, reading guide, big cursor, focus ring, link/heading highlights
- **Google Analytics** + **reCAPTCHA v3** (env-gated, toggleable from admin panel)
- SEO: dynamic sitemap, robots, JSON-LD, OpenGraph, canonical URLs
- **Cookie consent** banner (GDPR)

---

## 🏗 Architecture

```mermaid
flowchart LR
    A[Browser — uploader] -- "presigned PUT" --> R2[(Cloudflare R2 / S3)]
    B[Browser — downloader] -- "presigned GET" --> R2
    A -- "create/complete/history" --> N[Next.js API on VPS]
    B -- "download/verify-pw" --> N
    N -- "transfer records" --> RD[(Redis)]
    N -. "auth/history/settings" .-> SB[(Supabase)]
    N -. "cleanup queue" .-> RD
    CRON[Alpine cron container] -- "POST /api/cron/cleanup every 5 min" --> N
    N -- "batch DeleteObjects" --> R2

    P2P_A[Browser — sender] <-- "WebRTC DataChannel" --> P2P_B[Browser — receiver]
    P2P_A -- "signaling / presence / stats" --> N
    N -. "STUN/TURN" .-> T{{STUN · TURN}}
```

> **Cloud transfers**: file bytes flow **browser → R2/S3 → browser** via presigned URLs — the VPS never touches them.  
> **P2P transfers**: file bytes flow **browser → browser** directly — the server only handles signaling.

---

## 🗄 Storage & cleanup approach

Cloudflare R2 charges for **storage** ($/GB-month) and **Class A operations** (PUT). **Zero egress fees** — downloads are free.  
AWS S3 charges egress but supports storage-class tiering for significant cost savings.

### Storage providers

| Provider | Egress | Storage | Best for |
|---|---|---|---|
| **Cloudflare R2** | $0 | ~$0.015/GB-month | Default — lowest cost for most deployments |
| **AWS S3 Standard** | $0.09/GB | $0.023/GB-month | High-frequency access |
| **AWS S3 Intelligent-Tiering** | $0.09/GB | Auto ~$0.023→$0.0125/GB | Mixed access patterns |
| **AWS S3 Standard-IA** | $0.09/GB | ~$0.0125/GB-month | Files accessed < once/month (~45% saving) |
| **AWS S3 Glacier IR** | $0.09/GB | ~$0.004/GB-month | Archive transfers, instant retrieval (~68% saving) |

Switch providers from **Admin → Settings → Storage** — no redeploy needed.

### How cleanup works

1. **On create**: each transfer is registered in a Redis sorted set (`transfer:cleanup`) with score = `expiresAt` ms.
2. **Cron container**: an Alpine Docker container runs `crond` and calls `POST /api/cron/cleanup` (Bearer auth) every **5 minutes**. The endpoint batch-deletes up to 500 expired R2/S3 objects per run using `DeleteObjects`.
3. **Burn after read**: on first download the cleanup entry is overwritten with score = `now + 30s` — guaranteeing deletion within 30 seconds.
4. **Belt-and-suspenders**: `sweepExpiredTransfers()` is also called fire-and-forget on every create and download request, so cleanup still happens on low-traffic sites without the cron container.

---

## 🛠 Admin settings panel

The `/admin` page (access gated by `ADMIN_EMAILS`) includes a **Settings** panel with three tabs:

| Tab | What you can manage |
|---|---|
| **Email / SMTP** | Host, port, user, password, from address |
| **Storage** | Provider toggle (R2 or S3), credentials, S3 storage class |
| **Features** | Enable/disable email notifications, transfer tracking, reCAPTCHA, guest uploads, new registrations |

Settings are stored in a Supabase `app_settings` table (service-role access only — RLS blocks all public reads). Values override env vars with a **30-second in-process cache** — changes take effect without restarting the container.

**Required for settings panel:** `SUPABASE_SERVICE_ROLE_KEY` env var + run `supabase/app_settings.sql` in Supabase SQL Editor once.

---

## 🔒 Security

| Control | Implementation |
|---|---|
| Auth-gated routes | `/transfer` (upload), `/transfer/history`, `/admin`, `/send`, `/account` |
| Public routes | `/transfer/[slug]` download pages — share links work without login |
| Rate limiting | Redis fixed-window: 10 creates/10 min, 15 downloads/5 min, 5 pw-attempts/10 min per IP |
| Password hashing | SHA-256 (ephemeral transfer passwords) |
| Cron endpoint | Bearer `CRON_SECRET` — not publicly accessible |
| App settings RLS | `app_settings` table blocked for `anon` and `authenticated` roles — service role only |
| Content Security Policy | Full allowlist covering R2, S3, Supabase, GA, reCAPTCHA, fonts, WebRTC |
| Security headers | X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| No secrets in repo | All keys are env vars or DB settings; `.env.local.example` contains only placeholders |
| HTTPS | Auto-provisioned via acme-companion (Let's Encrypt) — covers both www and non-www |

---

## 🚀 Quick start

```bash
git clone https://github.com/zestcommerce841428-png/zync.git
cd zync
pnpm install
cp .env.local.example .env.local   # fill in what you need (everything optional)
pnpm dev                            # http://localhost:3000
```

For full WebRTC testing (STUN/TURN + Redis):

```bash
pnpm dev:full
```

---

## 🚢 Deploy

### Option A — Vercel (fastest, free tier)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/zestcommerce841428-png/zync)

Set `NEXT_PUBLIC_SITE_URL` → redeploy. Zero config for P2P + tools + blog.  
Add Supabase / Redis / R2 / SMTP keys to unlock cloud transfers, accounts, and email.

### Option B — VPS with Docker (production, recommended)

The production stack uses **nginx-proxy + acme-companion** (auto-HTTPS for www + non-www) + Redis + App + Watchtower (auto-update) + cron cleanup container.

The VPS docker-compose lives at `/docker/zync/docker-compose.yml` on the server (managed via Hostinger Docker Manager). See `deploy/vps/` for reference configuration.

Required env vars on VPS:

```env
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
REDIS_URL=redis://redis:6379
ADMIN_EMAILS=you@example.com
# Cloudflare R2 (cloud transfers)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
# Cron cleanup auth
CRON_SECRET=<32-hex>
# Supabase (accounts + runtime settings)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
# SMTP (email notifications — can also be set from admin panel)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

### Option C — Pre-built GHCR image

```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SITE_URL=http://localhost:3000 \
  ghcr.io/zestcommerce841428-png/zync:latest
```

Tags: `latest`, `main`, short commit SHA, and semver on `v*` tags.  
Watchtower polls GHCR every 60 s and auto-restarts the app container on new `:latest`.

---

## ⚙️ Configuration

All integrations are optional — the app runs without any keys and lights features up as you add them.  
SMTP, R2/S3 credentials, and feature flags can also be managed from the `/admin` settings panel at runtime.

| Area | Variables |
|---|---|
| Site | `NEXT_PUBLIC_SITE_URL` |
| Scaling | `REDIS_URL` |
| Cloudflare R2 | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` |
| AWS S3 | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` |
| Cron cleanup | `CRON_SECRET` (generate: `openssl rand -hex 32`) |
| Auth & settings DB | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Admin | `ADMIN_EMAILS` (comma-separated) |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` |
| Analytics | `NEXT_PUBLIC_GA_ID` |
| reCAPTCHA | `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY` |
| WebRTC TURN | `COTURN_ENABLED`, `TURN_HOST`, `TURN_REALM` |

See `.env.local.example` for all variables with inline docs.

### Supabase SQL migrations

Run once in Supabase SQL Editor:

| File | Purpose |
|---|---|
| `supabase/transfers.sql` | Transfer history table (per-user, RLS) |
| `supabase/posts.sql` | Blog posts table (admin-managed) |
| `supabase/app_settings.sql` | Runtime settings table (service-role only) |

---

## 🧱 Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19 · Material UI v9 · Emotion |
| Language | TypeScript 5 |
| File storage | Cloudflare R2 (zero egress) · AWS S3 (Intelligent-Tiering / Standard-IA / Glacier IR) |
| Cache / queues | Redis 7 (rate limiting, cleanup queue, presence, pub-sub) |
| Auth | Supabase (Google OAuth, magic link, TOTP 2FA, RLS) |
| Runtime config | Supabase `app_settings` table — DB-backed, 30 s cache, overrides env vars |
| Email | Nodemailer (SMTP) — transfer notifications, download alerts, sign-in alerts |
| P2P | PeerJS (WebRTC DataChannels, STUN/TURN) |
| Client ZIP | fflate (browser-side, no server required) |
| Testing | Vitest (unit) · Playwright (E2E) |
| Container | Docker · nginx-proxy · acme-companion (auto-HTTPS) · Watchtower (auto-update) |
| CI/CD | GitHub Actions → GHCR image → Watchtower polls every 60 s |

---

## 📜 Scripts

```bash
pnpm dev            # dev server (localhost:3000)
pnpm dev:full       # dev + Redis + COTURN
pnpm build          # production build
pnpm type:check     # TypeScript check
pnpm lint:check     # ESLint
pnpm format         # Prettier
pnpm test           # Vitest unit tests
pnpm test:e2e       # Playwright E2E
pnpm ci             # full CI pipeline
```

---

## 📬 Contact

- **Live site**: [videodownloaders.cloud](https://videodownloaders.cloud)
- **Email**: contact@videodownloaders.cloud
- **WhatsApp**: +91 7492068998

---

## 📄 License

BSD-3-Clause. Originally based on the open-source [FilePizza](https://github.com/kern/filepizza) project;
substantially reworked and extended into Zync.
