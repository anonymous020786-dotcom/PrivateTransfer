import Redis from 'ioredis'
import { MemoryRedis } from './local/memoryRedis'
import { isLocalBackend } from './local/mode'

export { Redis }

// Shared across route bundles (Next.js dev may load this module more than once).
const g = globalThis as unknown as { __zyncRedis?: Redis }

// REDIS_URL → real Redis. Without it, the local backend uses an embedded,
// disk-persisted store so transfers, boards, workspaces etc. work with no
// external services; otherwise fall back to a Redis on localhost:6379.
export function getRedisClient(): Redis {
  // After a dev hot-reload that adds commands to MemoryRedis, the cached
  // instance predates them; replace it (it reloads the same snapshot file).
  // Duck-typed on purpose: route bundles each hold their own copy of the
  // class, so `instanceof` would make them evict each other.
  const cached = g.__zyncRedis as unknown as Record<string, unknown> | undefined
  const stale =
    cached !== undefined &&
    !(cached instanceof Redis) &&
    Object.getOwnPropertyNames(MemoryRedis.prototype).some(
      (m) => typeof cached[m] !== 'function',
    )
  if (!g.__zyncRedis || stale) {
    g.__zyncRedis = process.env.REDIS_URL
      ? new Redis(process.env.REDIS_URL)
      : isLocalBackend()
        ? (new MemoryRedis() as unknown as Redis)
        : new Redis()
  }
  return g.__zyncRedis
}
