import 'server-only'
import { createHash, randomBytes } from 'crypto'
import { getRedisClient } from '../redisClient'

export type ApiKeyRecord = {
  id: string
  userId: string
  name: string
  keyHash: string // SHA-256 of the raw key, never store raw
  createdAt: string
  lastUsedAt: string | null
}

const KEY = (userId: string, id: string) => `apikey:${userId}:${id}`
const IDX = (userId: string) => `apikeys:${userId}`
const HASH_IDX = (hash: string) => `apikey:byhash:${hash}`

export function generateApiKey(): string {
  return `zync_${randomBytes(32).toString('hex')}`
}

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex')
}

export async function listApiKeys(userId: string): Promise<ApiKeyRecord[]> {
  const redis = getRedisClient()
  const ids = await redis.smembers(IDX(userId))
  if (ids.length === 0) return []
  const raws = await Promise.all(ids.map((id) => redis.get(KEY(userId, id))))
  return raws
    .filter((r): r is string => r !== null)
    .map((r) => JSON.parse(r) as ApiKeyRecord)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
}

export async function saveApiKey(record: ApiKeyRecord): Promise<void> {
  const redis = getRedisClient()
  await redis.set(KEY(record.userId, record.id), JSON.stringify(record))
  await redis.sadd(IDX(record.userId), record.id)
  // Reverse index for auth lookup
  await redis.set(HASH_IDX(record.keyHash), `${record.userId}:${record.id}`)
}

export async function deleteApiKey(userId: string, id: string): Promise<void> {
  const redis = getRedisClient()
  const raw = await redis.get(KEY(userId, id))
  if (!raw) return
  const record = JSON.parse(raw) as ApiKeyRecord
  await redis.del(KEY(userId, id))
  await redis.srem(IDX(userId), id)
  await redis.del(HASH_IDX(record.keyHash))
}

export async function lookupApiKey(
  rawKey: string,
): Promise<{ userId: string; keyId: string } | null> {
  const redis = getRedisClient()
  const hash = hashApiKey(rawKey)
  const val = await redis.get(HASH_IDX(hash))
  if (!val) return null
  const [userId, keyId] = val.split(':')
  // Update lastUsedAt (fire-and-forget)
  void (async () => {
    const raw = await redis.get(KEY(userId, keyId))
    if (!raw) return
    const record = JSON.parse(raw) as ApiKeyRecord
    await redis.set(
      KEY(userId, keyId),
      JSON.stringify({ ...record, lastUsedAt: new Date().toISOString() }),
    )
  })()
  return { userId, keyId }
}
