import 'server-only'
import { getRedisClient } from '../redisClient'

export type ContactGroup = {
  id: string
  ownerId: string
  name: string
  emails: string[]
  createdAt: string
}

const KEY = (id: string) => `cgroup:${id}`
const USER_KEY = (ownerId: string) => `cgroups:user:${ownerId}`
const TTL = 370 * 24 * 3600

export async function createContactGroup(
  ownerId: string,
  name: string,
  emails: string[],
): Promise<ContactGroup> {
  const redis = getRedisClient()
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
  const group: ContactGroup = {
    id,
    ownerId,
    name,
    emails: [...new Set(emails)],
    createdAt: new Date().toISOString(),
  }
  await redis.set(KEY(id), JSON.stringify(group), 'EX', TTL)
  await redis.zadd(USER_KEY(ownerId), Date.now(), id)
  await redis.expire(USER_KEY(ownerId), TTL)
  return group
}

export async function getContactGroup(
  id: string,
): Promise<ContactGroup | null> {
  const redis = getRedisClient()
  const raw = await redis.get(KEY(id))
  if (!raw) return null
  try {
    return JSON.parse(raw) as ContactGroup
  } catch {
    return null
  }
}

export async function updateContactGroup(
  id: string,
  patch: Partial<ContactGroup>,
): Promise<void> {
  const redis = getRedisClient()
  const existing = await getContactGroup(id)
  if (!existing) return
  await redis.set(KEY(id), JSON.stringify({ ...existing, ...patch }), 'EX', TTL)
}

export async function deleteContactGroup(
  id: string,
  ownerId: string,
): Promise<void> {
  const redis = getRedisClient()
  const g = await getContactGroup(id)
  if (!g || g.ownerId !== ownerId) return
  await redis.del(KEY(id))
  await redis.zrem(USER_KEY(ownerId), id)
}

export async function listContactGroups(
  ownerId: string,
): Promise<ContactGroup[]> {
  const redis = getRedisClient()
  const ids = await redis.zrange(USER_KEY(ownerId), 0, -1)
  if (ids.length === 0) return []
  const groups = await Promise.all(ids.map(getContactGroup))
  return groups.filter((g): g is ContactGroup => g !== null)
}
