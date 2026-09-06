# Deploy Zync on major cloud providers

Zync is a standard **Node.js + Docker** app, so it runs on any major cloud. The
repo ships a production [`Dockerfile`](../Dockerfile) (Next.js `output:
'standalone'`) and platform specs for the easiest paths.

> **Two processes.** The web app and the PeerJS signaling server can run
> together or separately. Free public TURN/STUN is on by default, so you only
> need the web app to go live. Self-host PeerJS ([`bin/peerjs.js`](../bin/peerjs.js))
> for reliability.

Common runtime env vars (see [CONFIGURATION.md](CONFIGURATION.md) for the full list):

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | your public HTTPS URL (set after first deploy) |
| `FILEPIZZA_SECRET` | 64-hex session secret (`openssl rand -hex 32`) |
| `PEERJS_HOST` / `PEERJS_PATH` | point to your PeerJS service (optional) |
| `REDIS_URL` | scaling across instances (optional) |
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | accounts + Google login (optional) |

---

## ☁️ AWS

### Option A — App Runner (simplest)
Fully managed containers, HTTPS + autoscaling included.
```bash
# Build & push the image to ECR, then create the service from it:
aws ecr create-repository --repository-name zync
docker build -t zync .
docker tag zync:latest <acct>.dkr.ecr.<region>.amazonaws.com/zync:latest
aws ecr get-login-password | docker login --username AWS --password-stdin <acct>.dkr.ecr.<region>.amazonaws.com
docker push <acct>.dkr.ecr.<region>.amazonaws.com/zync:latest
# Console: App Runner -> Create -> Container registry -> pick the image -> port 3000
```
Or use the managed Node runtime via [`apprunner.yaml`](../apprunner.yaml) (point
App Runner at the GitHub repo). Set env vars in the App Runner console.

### Option B — ECS Fargate
Push the image to ECR (above), create an ECS cluster + Fargate service, put an
**Application Load Balancer** in front (port 3000), terminate TLS with ACM.

### Option C — Elastic Beanstalk (Docker platform)
`eb init -p docker zync && eb create zync-env`. EB builds the Dockerfile and
provisions the load balancer.

---

## ☁️ Google Cloud — Cloud Run (recommended)

Serverless containers, scales to zero, HTTPS out of the box.
```bash
gcloud run deploy zync \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars NODE_ENV=production
# Then set the rest:
gcloud run services update zync \
  --set-env-vars NEXT_PUBLIC_SITE_URL=https://zync-xxx.run.app \
  --update-secrets FILEPIZZA_SECRET=zync-secret:latest
```
`--source .` builds the Dockerfile with Cloud Build automatically. Deploy PeerJS
as a second Cloud Run service (`run_command: node bin/peerjs.js`).

---

## ☁️ Microsoft Azure

### Option A — Container Apps (recommended)
```bash
az containerapp up \
  --name zync \
  --resource-group zync-rg \
  --location eastus \
  --source . \
  --ingress external \
  --target-port 3000
# Set env vars:
az containerapp update --name zync --resource-group zync-rg \
  --set-env-vars NODE_ENV=production NEXT_PUBLIC_SITE_URL=https://<fqdn>
```

### Option B — App Service (Web App for Containers)
Push the image to **Azure Container Registry**, then create a Web App for
Containers pointing at it, with `WEBSITES_PORT=3000` in the app settings.

---

## ☁️ DigitalOcean

### Option A — App Platform (recommended)
The repo ships [`.do/app.yaml`](../.do/app.yaml) (web + PeerJS):
```bash
doctl apps create --spec .do/app.yaml
```
Or: DO console → **Apps → Create App** → import this GitHub repo (auto-detects
the Dockerfile) → set `NEXT_PUBLIC_SITE_URL` + `FILEPIZZA_SECRET`.

### Option B — Droplet (full VPS)
A `$4–6/mo` Droplet runs the whole stack (app + PeerJS + Caddy HTTPS + optional
Redis/coturn). Same steps as any Ubuntu VPS — see [DEPLOYMENT.md](DEPLOYMENT.md)
and the reverse-proxy/systemd samples in [`deploy/oracle/`](../deploy/oracle/).

---

## Quick comparison

| Provider | Service | Free tier | Scales to zero | Self-host TURN |
| --- | --- | --- | --- | --- |
| AWS | App Runner | ❌ (pay-as-you-go) | ❌ | on a separate EC2 |
| GCP | Cloud Run | ✅ generous | ✅ | on a separate VM |
| Azure | Container Apps | ✅ monthly grant | ✅ | on a separate VM |
| DigitalOcean | App Platform | ❌ (low cost) | ❌ | Droplet |
| Render | Blueprint | ✅ | sleeps | Droplet/VM |
| Vercel | — | ✅ | ✅ | uses free Open Relay |

> For a **fully free** deploy with zero config, use **Vercel** or **Render** —
> see the [README](../README.md). The providers above are for teams that want a
> specific cloud, their own domain, or all-in-one self-hosting.
