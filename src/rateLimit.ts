import 'server-only'
import { getRedisClient } from './redisClient'
import type { NextRequest } from 'next/server'

// Fixed-window rate limiter. Backed by Redis when available (atomic INCR with
// per-window expiry), otherwise an in-memory map suitable for single-process
// dev. Returns remaining quota so callers can surface rate-limit headers.

export type RateLimitResult = {
  success: boolean
  limit: number
  remaining: number
  resetSeconds: number
}

const globalForRateLimit = globalThis as unknown as {
  __filepizzaRateBuckets?: Map<string, { count: number; expiresAt: number }>
}
const memoryBuckets =
  globalForRateLimit.__filepizzaRateBuckets ??
  (globalForRateLimit.__filepizzaRateBuckets = new Map<
    string,
    { count: number; expiresAt: number }
  >())

export function getClientIp(request: NextRequest | Request): string {
  const h = request.headers
  const fwd = h.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return h.get('x-real-ip') || 'unknown'
}

export async function rateLimit(
  identifier: string,
  {
    limit = 30,
    windowSeconds = 60,
  }: { limit?: number; windowSeconds?: number } = {},
): Promise<RateLimitResult> {
  const bucketKey = `ratelimit:${identifier}:${Math.floor(
    Date.now() / 1000 / windowSeconds,
  )}`

  let count: number

  if (process.env.REDIS_URL) {
    const client = getRedisClient()
    count = await client.incr(bucketKey)
    if (count === 1) {
      await client.expire(bucketKey, windowSeconds)
    }
  } else {
    const now = Date.now()
    const existing = memoryBuckets.get(bucketKey)
    if (!existing || existing.expiresAt < now) {
      memoryBuckets.set(bucketKey, {
        count: 1,
        expiresAt: now + windowSeconds * 1000,
      })
      count = 1
    } else {
      existing.count++
      count = existing.count
    }
    // Opportunistic cleanup
    if (memoryBuckets.size > 5000) {
      for (const [k, v] of memoryBuckets) {
        if (v.expiresAt < now) memoryBuckets.delete(k)
      }
    }
  }

  const remaining = Math.max(0, limit - count)
  return {
    success: count <= limit,
    limit,
    remaining,
    resetSeconds: windowSeconds,
  }
}

export function rateLimitHeaders(r: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(r.limit),
    'X-RateLimit-Remaining': String(r.remaining),
    'X-RateLimit-Reset': String(r.resetSeconds),
  }
}
