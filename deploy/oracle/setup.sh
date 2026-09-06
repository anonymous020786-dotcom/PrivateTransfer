#!/usr/bin/env bash
# One-shot provisioner for Zync on an Oracle Cloud Always Free VM (Ubuntu 22.04+).
# Run as the `ubuntu` user. Review before running.
set -euo pipefail

echo "==> Installing Node 22, pnpm, Redis, coturn, Caddy..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get update
sudo apt-get install -y nodejs redis-server coturn git ufw
sudo npm install -g pnpm

# Caddy (reverse proxy + auto TLS)
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update && sudo apt-get install -y caddy

echo "==> Enabling Redis..."
sudo systemctl enable --now redis-server

echo "==> Opening the host firewall (Oracle images block ports by default)..."
sudo ufw allow 22/tcp
sudo ufw allow 80,443/tcp
sudo ufw allow 3478
sudo ufw allow 5349
sudo ufw allow 49152:65535/udp
sudo ufw --force enable

echo "==> Cloning + building Zync..."
cd "$HOME"
[ -d zync ] || git clone https://github.com/zestcommerce841428-png/zync.git
cd zync
pnpm install
node scripts/generate-blog.mjs
pnpm build

cat <<'NOTE'

==> Manual steps remaining:
  1. Create $HOME/zync/.env.local from .env.local.example and fill in keys
     (set REDIS_URL=redis://localhost:6379, COTURN_ENABLED=true,
      TURN_HOST=turn.<your-domain>, TURN_REALM=<your-domain>,
      PEERJS_HOST=peer.<your-domain>).
  2. Copy deploy/oracle/turnserver.conf -> /etc/turnserver.conf, set external-ip
     and cert paths; enable coturn:  sudo systemctl enable --now coturn
  3. Copy deploy/oracle/Caddyfile -> /etc/caddy/Caddyfile (edit domains);
     sudo systemctl reload caddy
  4. Install services:
       sudo cp deploy/oracle/systemd/*.service /etc/systemd/system/
       sudo systemctl daemon-reload
       sudo systemctl enable --now zync-web zync-peerjs
  5. IMPORTANT: also open the SAME ports in the Oracle Cloud VCN Security List
     (ingress): TCP 80,443,3478,5349 and UDP 3478,5349,49152-65535.
NOTE
echo "Done."
