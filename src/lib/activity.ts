import 'server-only'
import { getRedisClient } from '../redisClient'

// Per-account security & activity log (newest first, capped). Users see their
// own log under Account → Activity and it is included in their data export.
// IPs are stored masked (last IPv4 octet / IPv6 tail dropped).

export const ACTIVITY_TYPES = [
  'auth.signup',
  'auth.signin',
  'auth.signin_failed',
  'auth.signout',
  'auth.signout_others',
  'auth.password_changed',
  'auth.password_reset',
  'auth.email_code_signin',
  'auth.mfa_enabled',
  'auth.mfa_disabled',
  'auth.mfa_challenge_passed',
  'profile.updated',
  'transfer.created',
  'transfer.deleted',
  'transfer.downloaded',
  'apikey.created',
  'apikey.revoked',
  'account.exported',
] as const

export type ActivityType = (typeof ACTIVITY_TYPES)[number]

export type ActivityEntry = {
  type: ActivityType
  at: string
  ip: string | null
  agent: string | null
  detail?: string
}

// Events the browser may report itself (Supabase handles these client-side,
// so the server never sees them otherwise). They only land in the caller's
// own log, so self-reporting cannot affect anyone else.
export const CLIENT_REPORTABLE: ReadonlySet<ActivityType> = new Set([
  'auth.signin',
  'auth.signout_others',
  'auth.password_changed',
  'auth.mfa_enabled',
  'auth.mfa_disabled',
  'profile.updated',
])

const KEY = (uid: string) => `activity:${uid}`
const MAX = 200

export function maskIp(ip: string | null | undefined): string | null {
  if (!ip || ip === 'unknown') return null
  if (ip.includes('.')) return ip.split('.').slice(0, 3).join('.') + '.x'
  return ip.split(':').slice(0, 3).join(':') + ':…'
}

// Compact "Browser on OS" label from a User-Agent string.
export function describeAgent(ua: string | null | undefined): string | null {
  if (!ua) return null
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : /curl\//.test(ua)
              ? 'curl'
              : 'Unknown browser'
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad/.test(ua)
        ? 'iOS'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : null
  return os ? `${browser} on ${os}` : browser
}

export async function recordActivity(
  uid: string,
  type: ActivityType,
  ctx: { ip?: string | null; agent?: string | null; detail?: string } = {},
): Promise<void> {
  try {
    const entry: ActivityEntry = {
      type,
      at: new Date().toISOString(),
      ip: maskIp(ctx.ip),
      agent: describeAgent(ctx.agent),
      ...(ctx.detail ? { detail: ctx.detail.slice(0, 200) } : {}),
    }
    const redis = getRedisClient()
    await redis.lpush(KEY(uid), JSON.stringify(entry))
    await redis.ltrim(KEY(uid), 0, MAX - 1)
    await redis.expire(KEY(uid), 400 * 24 * 3600)
  } catch {
    // never let auditing break the action being audited
  }
}

export async function listActivity(
  uid: string,
  limit = MAX,
): Promise<ActivityEntry[]> {
  const raw = await getRedisClient().lrange(KEY(uid), 0, limit - 1)
  return raw.flatMap((r) => {
    try {
      return [JSON.parse(r) as ActivityEntry]
    } catch {
      return []
    }
  })
}

export async function clearActivity(uid: string): Promise<void> {
  await getRedisClient().del(KEY(uid))
}

export function requestContext(req: Request): {
  ip: string
  agent: string | null
} {
  const h = req.headers
  return {
    ip:
      h.get('cf-connecting-ip') ||
      h.get('x-forwarded-for')?.split(',')[0].trim() ||
      h.get('x-real-ip') ||
      'unknown',
    agent: h.get('user-agent'),
  }
}
