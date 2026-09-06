# Deploy Zync on Render (free, no domain, no credit card)

The included [`render.yaml`](../render.yaml) blueprint spins up two free
services and **auto-wires** the secret, the PeerJS host, and free TURN — so you
add very little by hand.

- `zync` — the Next.js app
- `zync-peerjs` — a self-hosted PeerJS signaling server (more reliable than the
  public `0.peerjs.com` used by the Vercel path)

> Free-tier caveat: a Render web service **sleeps after ~15 min idle**, so the
> first request after a quiet period has a ~30s cold start.

---

## 1. Deploy the blueprint

Render Dashboard → **New → Blueprint** → pick this repo → **Apply**.

## 2. Set by hand on the `zync` service

Dashboard → **zync → Environment**.

```env
# Required after the first deploy: set to your real URL, then redeploy
NEXT_PUBLIC_SITE_URL=https://zync.onrender.com

# Final values — paste as-is
ADMIN_EMAILS=you@example.com
SMTP_FROM=you@example.com
HOSTINGER_UPLOAD_URL=https://api.example.com/api4/upload.php
HOSTINGER_API_TOKEN=PASTE_YOUR_UPLOAD_TOKEN_HERE
```

## 3. render.yaml already handles these (do NOT add them)

| Variable | How it's set |
| --- | --- |
| `FILEPIZZA_SECRET` | auto-generated per environment |
| `PEERJS_HOST` | auto-wired to the `zync-peerjs` service host |
| `PEERJS_PATH` | `/peerjs/filepizza` |
| `NODE_VERSION` | `22` |
| Free TURN/STUN | on by default in the ICE route |

## 4. Optional — unlock the rest later (each free, no card)

```env
# Scaling — upstash.com → Create Database → copy the rediss:// URL
REDIS_URL=rediss://default:PASSWORD@your-db.upstash.io:6379

# Accounts + Google login — supabase.com → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=PASTE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=PASTE_SERVICE_ROLE_KEY
SUPABASE_AVATAR_BUCKET=avatars

# Contact email — your Hostinger mailbox
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=you@example.com
SMTP_PASS=PASTE_MAILBOX_PASSWORD

# Analytics / anti-spam (optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=PASTE_RECAPTCHA_SITE_KEY
RECAPTCHA_SECRET_KEY=PASTE_RECAPTCHA_SECRET_KEY
```

**Minimum to go live:** set `NEXT_PUBLIC_SITE_URL` after the first deploy and
redeploy. Everything else self-defaults — the app runs with zero keys and lights
features up as you add them.

---

## Vercel vs Render

| | Vercel | Render |
| --- | --- | --- |
| PeerJS signaling | public `0.peerjs.com` | self-hosted `zync-peerjs` |
| Secret + PeerJS wiring | you paste it | auto via `render.yaml` |
| Idle behavior | always-on | sleeps after ~15 min (cold start) |

See also [`DEPLOYMENT.md`](DEPLOYMENT.md) and [`CONFIGURATION.md`](CONFIGURATION.md).
