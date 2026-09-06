import 'server-only'
import { getRedisClient } from './redisClient'

// Resumable-transfer bookkeeping. When a downloader receives chunks it can
// periodically persist the last acknowledged byte offset per file. If the
// connection drops and the downloader reconnects, it fetches the saved offsets
// and asks the uploader to resume from there instead of restarting at 0.
// Offsets are keyed by (slug, downloaderId, fileName) and expire with the
// channel.

export type FileProgress = Record<string, number> // fileName -> offset

const TTL = 60 * 60 // 1 hour, matches channel ttl

const globalForProgress = globalThis as unknown as {
  __filepizzaProgressMem?: Map<
    string,
    { value: FileProgress; expiresAt: number }
  >
}
const memory =
  globalForProgress.__filepizzaProgressMem ??
  (globalForProgress.__filepizzaProgressMem = new Map<
    string,
    { value: FileProgress; expiresAt: number }
  >())

function key(slug: string, downloaderId: string): string {
  return `progress:${slug}:${downloaderId}`
}

export async function saveProgress(
  slug: string,
  downloaderId: string,
  fileName: string,
  offset: number,
): Promise<void> {
  if (process.env.REDIS_URL) {
    const client = getRedisClient()
    await client.hset(key(slug, downloaderId), fileName, String(offset))
    await client.expire(key(slug, downloaderId), TTL)
  } else {
    const k = key(slug, downloaderId)
    const existing = memory.get(k)
    const value =
      existing && existing.expiresAt > Date.now() ? existing.value : {}
    value[fileName] = offset
    memory.set(k, { value, expiresAt: Date.now() + TTL * 1000 })
  }
}

export async function getProgress(
  slug: string,
  downloaderId: string,
): Promise<FileProgress> {
  if (process.env.REDIS_URL) {
    const raw = await getRedisClient().hgetall(key(slug, downloaderId))
    const out: FileProgress = {}
    for (const [k, v] of Object.entries(raw)) out[k] = Number(v)
    return out
  }
  const entry = memory.get(key(slug, downloaderId))
  if (!entry || entry.expiresAt < Date.now()) return {}
  return { ...entry.value }
}

export async function clearProgress(
  slug: string,
  downloaderId: string,
): Promise<void> {
  if (process.env.REDIS_URL) {
    await getRedisClient().del(key(slug, downloaderId))
  } else {
    memory.delete(key(slug, downloaderId))
  }
}
