import 'server-only'
import { EventEmitter } from 'events'
import { getRedisClient } from './redisClient'

// Real-time channel presence. Tracks whether an uploader is currently online
// (via heartbeats), how many people are viewing a download page, and how many
// downloads have started. Backed by Redis (with TTLs / sorted sets so it works
// across multiple server instances) or in-memory for local dev. An in-process
// EventEmitter lets SSE routes push updates instantly; a slow poll reconciles
// cross-instance state.

export type ChannelPresence = {
  uploaderOnline: boolean
  viewers: number
  downloads: number
  updatedAt: number
}

const UPLOADER_TTL = 90 // seconds; renewed by uploader heartbeat
const VIEWER_TTL = 30 // seconds; renewed by SSE keep-alive

// Shared across route-handler bundles via globalThis (Next.js dev does not
// guarantee a single module instance per server process).
const globalForPresence = globalThis as unknown as {
  __filepizzaPresenceEmitter?: EventEmitter
  __filepizzaPresenceMem?: Map<string, MemChannel>
}

const emitter =
  globalForPresence.__filepizzaPresenceEmitter ??
  (globalForPresence.__filepizzaPresenceEmitter = new EventEmitter())
emitter.setMaxListeners(0)

function channelEvent(slug: string): string {
  return `presence:${slug}`
}

export function subscribe(
  slug: string,
  cb: (p: ChannelPresence) => void,
): () => void {
  const handler = (p: ChannelPresence) => cb(p)
  emitter.on(channelEvent(slug), handler)
  return () => emitter.off(channelEvent(slug), handler)
}

async function notify(slug: string): Promise<void> {
  emitter.emit(channelEvent(slug), await getPresence(slug))
}

// ---- Memory backend ----
type MemChannel = {
  uploaderExpiresAt: number
  viewers: Map<string, number> // viewerId -> expiresAt
  downloads: number
}
const mem =
  globalForPresence.__filepizzaPresenceMem ??
  (globalForPresence.__filepizzaPresenceMem = new Map<string, MemChannel>())

function memChannel(slug: string): MemChannel {
  let c = mem.get(slug)
  if (!c) {
    c = { uploaderExpiresAt: 0, viewers: new Map(), downloads: 0 }
    mem.set(slug, c)
  }
  return c
}

function pruneViewers(c: MemChannel): number {
  const now = Date.now()
  for (const [id, exp] of c.viewers) {
    if (exp < now) c.viewers.delete(id)
  }
  return c.viewers.size
}

const useRedis = (): boolean => Boolean(process.env.REDIS_URL)

const RKEY = {
  uploader: (slug: string) => `presence:${slug}:uploader`,
  viewers: (slug: string) => `presence:${slug}:viewers`,
  downloads: (slug: string) => `presence:${slug}:downloads`,
}

export async function heartbeatUploader(slug: string): Promise<void> {
  if (useRedis()) {
    await getRedisClient().setex(RKEY.uploader(slug), UPLOADER_TTL, '1')
  } else {
    memChannel(slug).uploaderExpiresAt = Date.now() + UPLOADER_TTL * 1000
  }
  await notify(slug)
}

export async function setUploaderOffline(slug: string): Promise<void> {
  if (useRedis()) {
    await getRedisClient().del(RKEY.uploader(slug))
  } else {
    const c = mem.get(slug)
    if (c) c.uploaderExpiresAt = 0
  }
  await notify(slug)
}

export async function registerViewer(
  slug: string,
  viewerId: string,
): Promise<void> {
  if (useRedis()) {
    const client = getRedisClient()
    const now = Date.now()
    await client.zadd(RKEY.viewers(slug), now + VIEWER_TTL * 1000, viewerId)
    await client.zremrangebyscore(RKEY.viewers(slug), 0, now)
    await client.expire(RKEY.viewers(slug), VIEWER_TTL * 2)
  } else {
    memChannel(slug).viewers.set(
      slug + viewerId,
      Date.now() + VIEWER_TTL * 1000,
    )
  }
  await notify(slug)
}

export async function removeViewer(
  slug: string,
  viewerId: string,
): Promise<void> {
  if (useRedis()) {
    await getRedisClient().zrem(RKEY.viewers(slug), viewerId)
  } else {
    mem.get(slug)?.viewers.delete(slug + viewerId)
  }
  await notify(slug)
}

export async function recordDownload(slug: string): Promise<number> {
  let total: number
  if (useRedis()) {
    total = await getRedisClient().incr(RKEY.downloads(slug))
    await getRedisClient().expire(RKEY.downloads(slug), 60 * 60 * 24)
  } else {
    const c = memChannel(slug)
    c.downloads++
    total = c.downloads
  }
  await notify(slug)
  return total
}

export async function getPresence(slug: string): Promise<ChannelPresence> {
  if (useRedis()) {
    const client = getRedisClient()
    const now = Date.now()
    await client.zremrangebyscore(RKEY.viewers(slug), 0, now)
    const [uploader, viewers, downloads] = await Promise.all([
      client.exists(RKEY.uploader(slug)),
      client.zcard(RKEY.viewers(slug)),
      client.get(RKEY.downloads(slug)),
    ])
    return {
      uploaderOnline: uploader === 1,
      viewers: Number(viewers ?? 0),
      downloads: Number(downloads ?? 0),
      updatedAt: now,
    }
  }
  const c = memChannel(slug)
  return {
    uploaderOnline: c.uploaderExpiresAt > Date.now(),
    viewers: pruneViewers(c),
    downloads: c.downloads,
    updatedAt: Date.now(),
  }
}
