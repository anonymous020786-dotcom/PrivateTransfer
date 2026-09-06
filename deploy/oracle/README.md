# Zync on Oracle Cloud (Always Free) — all optionals, $0

Oracle's **Always Free** tier gives a VM with a public IP and openable UDP
ports, which is exactly what self-hosted **TURN (coturn)** and **PeerJS** need.
One box runs the app, Redis, coturn and PeerJS — every feature, free forever.

## Why not Cloudflare Workers / Vercel for this?

- Zync uses **ioredis (raw TCP)** for Redis/stats/presence/TURN creds — Workers
  can't do arbitrary TCP. **coturn and the PeerJS WS server can't run on
  serverless at all** (they need UDP + a persistent process). Use a VM.
- (Cloudflare is still great as free **DNS/CDN**, and its managed **Realtime
  TURN** can replace coturn with a small change to `src/app/api/ice/route.ts`.)

## 1. Create the VM

1. Oracle Cloud → **Compute → Instances → Create**.
2. Image **Ubuntu 22.04+**, shape **VM.Standard.A1.Flex** (Ampere ARM —
   Always Free; e.g. 2 OCPU / 12 GB). If you hit "out of capacity", pick a
   different availability domain/region and retry.
3. Add your SSH key, create. Note the **public IP**.
4. Point DNS A-records at the IP: `zync`, `peer`, `turn` subdomains.

## 2. Provision

```bash
ssh ubuntu@YOUR_PUBLIC_IP
curl -fsSL https://raw.githubusercontent.com/zestcommerce841428-png/zync/main/deploy/oracle/setup.sh -o setup.sh
bash setup.sh
```

The script installs Node 22, pnpm, Redis, coturn, Caddy, opens the host
firewall, then clones + builds Zync. Follow the printed manual steps.

## 3. Open ports in Oracle (critical, easy to miss)

Oracle blocks ingress in **two** places — both must allow the ports:

- **Host firewall** — handled by `setup.sh` (ufw).
- **VCN Security List / NSG** (in the Oracle console → Networking) — add
  **ingress rules**:
  - TCP `80`, `443`, `3478`, `5349`
  - UDP `3478`, `5349`, `49152-65535`

## 4. Environment (`~/zync/.env.local`)

```bash
NEXT_PUBLIC_SITE_URL=https://zync.your-domain
FILEPIZZA_SECRET=<long-random-string>

# Local Redis — shared by the app AND coturn
REDIS_URL=redis://localhost:6379

# Self-hosted TURN
COTURN_ENABLED=true
TURN_HOST=turn.your-domain
TURN_REALM=your-domain          # must match realm= in turnserver.conf
STUN_SERVER=stun:stun.l.google.com:19302

# Self-hosted PeerJS (bin/peerjs.js → :9000, path /peerjs/filepizza)
PEERJS_HOST=peer.your-domain
PEERJS_PATH=/peerjs/filepizza

# ...plus Supabase / SMTP / GA / reCAPTCHA as in docs/CONFIGURATION.md
```

## 5. Start everything

```bash
# coturn
sudo cp ~/zync/deploy/oracle/turnserver.conf /etc/turnserver.conf
sudo sed -i 's/YOUR_PUBLIC_IP/'"$(curl -s ifconfig.me)"'/' /etc/turnserver.conf
sudo systemctl enable --now coturn

# Caddy (edit domains first)
sudo cp ~/zync/deploy/oracle/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy   # auto-obtains TLS certs

# App + PeerJS
sudo cp ~/zync/deploy/oracle/systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now zync-web zync-peerjs
```

## 6. Verify

- `https://zync.your-domain` loads.
- Send a file between two devices on different networks → confirms STUN/TURN.
- `redis-cli KEYS 'turn/*'` shows ephemeral TURN creds during a connection.
- `sudo systemctl status coturn zync-web zync-peerjs caddy` all **active**.

## Hybrid option

Prefer managed services? Keep the **app on Vercel** + **Upstash Redis** +
**Supabase**, and run **only coturn** on the Oracle VM — just point coturn's
`redis-userdb` at your Upstash connection (host/port/password) so it shares
credentials with the app. PeerJS can stay on the public server or also run on
the VM.
