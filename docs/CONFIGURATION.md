# Zync configuration reference

Every integration is **optional**. Zync runs with zero configuration (in-memory
storage, public STUN/PeerJS) and lights up features as you add environment
variables. Copy `.env.local.example` to `.env.local` and set what you need.

## Core / transfer coordination

| Variable | Default | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://zync.app` | Public site URL — used for canonical URLs, OpenGraph, sitemap. |
| `FILEPIZZA_SECRET` | dev default | Secret used to sign anonymous session cookies. **Change in production.** |
| `REDIS_URL` | _(unset)_ | Connection string for a Redis instance used to store channel metadata, stats and presence. If not set, Zync falls back to in-memory storage (single instance only). |

## WebRTC: STUN / TURN (NAT traversal)

| Variable | Default | Description |
| --- | --- | --- |
| `STUN_SERVER` | `stun:stun.l.google.com:19302` | STUN server URL (always used). |
| `TURN_URLS` | _(unset)_ | **Static TURN** (no VM/card): comma-separated TURN/TURNS URLs from a provider like Metered Open Relay. When set, used directly. |
| `TURN_USERNAME` | _(unset)_ | Username for static TURN. |
| `TURN_CREDENTIAL` | _(unset)_ | Credential for static TURN. |
| `COTURN_ENABLED` | _(unset)_ | **Self-hosted TURN.** When `true`, generates ephemeral coturn credentials in Redis. Use only if running your own coturn. |
| `TURN_HOST` | `127.0.0.1` | Hostname/IP of the self-hosted TURN server. |
| `TURN_REALM` | `zync.app` | Realm used when generating coturn credentials. |

## WebRTC: PeerJS signaling

| Variable | Default | Description |
| --- | --- | --- |
| `PEERJS_HOST` | `0.peerjs.com` | Hostname or IP address of the (self-hosted) PeerJS server. |
| `PEERJS_PATH` | `/` | Path to the self-hosted PeerJS server. |

## Supabase (auth, accounts, storage)

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only.** Required for account deletion. Keep secret. |
| `SUPABASE_AVATAR_BUCKET` | Storage bucket for avatars (default `avatars`). |
| `ADMIN_EMAILS` | Comma-separated emails granted `/admin` access. |

Enable **Google** under Auth → Providers and **TOTP** under Auth → Multi-Factor.

## Email (Hostinger SMTP) — contact form

| Variable | Description |
| --- | --- |
| `SMTP_HOST` / `SMTP_PORT` | e.g. `smtp.hostinger.com` / `465`. |
| `SMTP_USER` / `SMTP_PASS` | Mailbox credentials. |
| `SMTP_FROM` | From address (defaults to `SMTP_USER`). |

## Profile-photo upload (PHP endpoint)

| Variable | Description |
| --- | --- |
| `HOSTINGER_UPLOAD_URL` | Your PHP upload endpoint (see `deploy/hostinger/api4/`). Preferred when set. |
| `HOSTINGER_API_TOKEN` | Shared secret; must match `ZYNC_UPLOAD_SECRET` in `api4/config.php`. |

## Analytics & anti-spam

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_GA_ID` | Google Analytics 4 id (`G-XXXX`). Loaded only after cookie consent. |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` / `RECAPTCHA_SECRET_KEY` | reCAPTCHA v3 keys for the contact form. |
