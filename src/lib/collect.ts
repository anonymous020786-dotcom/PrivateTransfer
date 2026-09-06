import 'server-only'
import { getRedisClient } from '../redisClient'

export type CollectFile = {
  key: string
  name: string
  size: number
  type: string
  uploadedAt: string
  uploaderNote?: string
  uploaderName?: string
}

export type CollectRecord = {
  slug: string
  ownerId: string
  ownerEmail: string
  title: string
  description: string
  expiresAt: string
  maxFiles: number
  files: CollectFile[]
  createdAt: string
  active: boolean // false after owner closes
  requestedFrom: { email: string; name?: string } | null // named file request (single)
  requestedFromMany: Array<{ email: string; name?: string }> // multi-respondent invites
}

const KEY = (slug: string) => `collect:${slug}`
const USER_KEY = (ownerId: string) => `collect:user:${ownerId}`
const MAX_TTL = 370 * 24 * 3600

export async function saveCollect(record: CollectRecord): Promise<void> {
  const redis = getRedisClient()
  const ttl = Math.ceil(
    (new Date(record.expiresAt).getTime() - Date.now()) / 1000,
  )
  if (ttl <= 0) return
  await redis.set(KEY(record.slug), JSON.stringify(record), 'EX', ttl)
  await redis.zadd(
    USER_KEY(record.ownerId),
    new Date(record.expiresAt).getTime(),
    record.slug,
  )
  await redis.expire(USER_KEY(record.ownerId), MAX_TTL)
}

export async function getCollect(slug: string): Promise<CollectRecord | null> {
  const redis = getRedisClient()
  const raw = await redis.get(KEY(slug))
  if (!raw) return null
  try {
    const r = JSON.parse(raw) as CollectRecord
    r.requestedFrom ??= null
    r.requestedFromMany ??= []
    return r
  } catch {
    return null
  }
}

export async function updateCollect(
  slug: string,
  patch: Partial<CollectRecord>,
): Promise<void> {
  const redis = getRedisClient()
  const existing = await getCollect(slug)
  if (!existing) return
  const updated = { ...existing, ...patch }
  const ttl = Math.ceil(
    (new Date(updated.expiresAt).getTime() - Date.now()) / 1000,
  )
  if (ttl <= 0) return
  await redis.set(KEY(slug), JSON.stringify(updated), 'EX', ttl)
}

export async function deleteCollect(
  slug: string,
  ownerId: string,
): Promise<void> {
  const redis = getRedisClient()
  await redis.del(KEY(slug))
  await redis.zrem(USER_KEY(ownerId), slug)
}

export async function listUserCollects(
  ownerId: string,
): Promise<CollectRecord[]> {
  const redis = getRedisClient()
  const slugs = await redis.zrangebyscore(USER_KEY(ownerId), Date.now(), '+inf')
  if (slugs.length === 0) return []
  const records = await Promise.all(slugs.map(getCollect))
  return records
    .filter((r): r is CollectRecord => r !== null)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
}
