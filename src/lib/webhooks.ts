import 'server-only'
import crypto from 'crypto'
import dns from 'dns/promises'
import net from 'net'
import { getRedisClient } from '../redisClient'

// Outbound webhooks: SSRF-safe delivery, HMAC signatures and a per-transfer
// delivery log.
//
// Signature scheme (Stripe-style), sent as `X-Zync-Signature: t=<unix>,v1=<hex>`
// where v1 = HMAC-SHA256(secret, `${t}.${rawBody}`). Receivers should recompute
// it and reject timestamps older than ~5 minutes to stop replays.

const LOG_KEY = (slug: string) => `webhook:log:${slug}`
const LOG_MAX = 25

export type WebhookDelivery = {
  id: string
  event: string
  url: string
  at: string
  status: number | null // HTTP status, null on network error / blocked
  ok: boolean
  durationMs: number
  error?: string
}

function secretBase(): string {
  return (
    process.env.FILEPIZZA_SECRET ||
    'filepizza-dev-secret-do-not-use-in-production'
  )
}

// Signing secret: per account for signed-in owners (one secret to configure
// for all their transfers), otherwise per transfer.
export function webhookSecretFor(ownerId: string | null, slug: string): string {
  const scope = ownerId ? `user:${ownerId}` : `transfer:${slug}`
  const mac = crypto
    .createHmac('sha256', `webhook-secret:${secretBase()}`)
    .update(scope)
    .digest('base64url')
  return `whsec_${mac}`
}

export function signPayload(secret: string, body: string, ts: number): string {
  const v1 = crypto
    .createHmac('sha256', secret)
    .update(`${ts}.${body}`)
    .digest('hex')
  return `t=${ts},v1=${v1}`
}

// ── SSRF guard ───────────────────────────────────────────────────────────────

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number)
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // CGNAT
      (a === 169 && b === 254) || // link-local / cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    )
  }
  const v = ip.toLowerCase()
  if (v.startsWith('::ffff:')) return isPrivateIp(v.slice(7))
  return (
    v === '::' ||
    v === '::1' ||
    v.startsWith('fc') ||
    v.startsWith('fd') ||
    v.startsWith('fe80') ||
    v.startsWith('ff')
  )
}

// Private destinations are allowed outside production so webhooks can be
// tested against a local receiver.
function allowPrivate(): boolean {
  return (
    process.env.ALLOW_PRIVATE_WEBHOOKS === 'true' ||
    process.env.NODE_ENV !== 'production'
  )
}

export async function checkWebhookUrl(raw: string): Promise<string | null> {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return 'Webhook URL is not a valid URL.'
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:')
    return 'Webhook URL must use http or https.'
  if (u.username || u.password)
    return 'Webhook URL must not contain credentials.'
  if (allowPrivate()) return null
  const host = u.hostname.replace(/^\[|\]$/g, '')
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.internal')
  )
    return 'Webhook URL must point to a public host.'
  try {
    const addrs = net.isIP(host)
      ? [{ address: host }]
      : await dns.lookup(host, { all: true })
    if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address)))
      return 'Webhook URL must point to a public host.'
  } catch {
    return 'Webhook host could not be resolved.'
  }
  return null
}

// ── Delivery ─────────────────────────────────────────────────────────────────

async function logDelivery(slug: string, d: WebhookDelivery): Promise<void> {
  try {
    const redis = getRedisClient()
    await redis.lpush(LOG_KEY(slug), JSON.stringify(d))
    await redis.ltrim(LOG_KEY(slug), 0, LOG_MAX - 1)
    await redis.expire(LOG_KEY(slug), 370 * 24 * 3600)
  } catch {
    // logging is best-effort
  }
}

export async function listDeliveries(slug: string): Promise<WebhookDelivery[]> {
  const raw = await getRedisClient().lrange(LOG_KEY(slug), 0, LOG_MAX - 1)
  return raw.flatMap((r) => {
    try {
      return [JSON.parse(r) as WebhookDelivery]
    } catch {
      return []
    }
  })
}

// Deliver one event. `format: 'slack'` posts Slack's plain {text} body without
// Zync signature headers (Slack incoming webhooks ignore them).
export async function deliverWebhook(opts: {
  url: string
  slug: string
  ownerId: string | null
  event: string
  payload: Record<string, unknown>
  format?: 'zync' | 'slack'
}): Promise<WebhookDelivery> {
  const id = crypto.randomUUID()
  const started = Date.now()
  const base: Omit<WebhookDelivery, 'status' | 'ok' | 'durationMs'> = {
    id,
    event: opts.event,
    url: opts.url,
    at: new Date().toISOString(),
  }

  const blocked = await checkWebhookUrl(opts.url)
  if (blocked) {
    const d = {
      ...base,
      status: null,
      ok: false,
      durationMs: 0,
      error: blocked,
    }
    await logDelivery(opts.slug, d)
    return d
  }

  const body =
    opts.format === 'slack'
      ? JSON.stringify(opts.payload)
      : JSON.stringify({
          id,
          event: opts.event,
          createdAt: base.at,
          data: opts.payload,
        })
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Zync-Webhooks/1.0',
  }
  if (opts.format !== 'slack') {
    const ts = Math.floor(Date.now() / 1000)
    headers['X-Zync-Event'] = opts.event
    headers['X-Zync-Delivery'] = id
    headers['X-Zync-Signature'] = signPayload(
      webhookSecretFor(opts.ownerId, opts.slug),
      body,
      ts,
    )
  }

  let d: WebhookDelivery
  try {
    const res = await fetch(opts.url, {
      method: 'POST',
      headers,
      body,
      redirect: 'manual', // a redirect could bounce us to an internal host
      signal: AbortSignal.timeout(5000),
    })
    d = {
      ...base,
      status: res.status,
      ok: res.ok,
      durationMs: Date.now() - started,
    }
  } catch (e) {
    d = {
      ...base,
      status: null,
      ok: false,
      durationMs: Date.now() - started,
      error:
        (e as Error).name === 'TimeoutError'
          ? 'Timed out after 5s'
          : 'Network error',
    }
  }
  await logDelivery(opts.slug, d)
  return d
}
