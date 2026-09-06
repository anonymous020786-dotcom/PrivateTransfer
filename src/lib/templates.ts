import 'server-only'
import { getRedisClient } from '../redisClient'

export type TemplateSettings = {
  title?: string
  message?: string
  expiryDays?: number
  maxDownloads?: number | null
  notifyEmail?: string
  notifyEveryDownload?: boolean
  burnAfterRead?: boolean
  background?: string
  webhookUrl?: string
}

export type TransferTemplate = {
  id: string
  userId: string
  name: string
  settings: TemplateSettings
  createdAt: string
}

const KEY = (userId: string, id: string) => `template:${userId}:${id}`
const IDX = (userId: string) => `templates:${userId}`

export async function listTemplates(
  userId: string,
): Promise<TransferTemplate[]> {
  const redis = getRedisClient()
  const ids = await redis.smembers(IDX(userId))
  if (ids.length === 0) return []
  const raws = await Promise.all(ids.map((id) => redis.get(KEY(userId, id))))
  return raws
    .filter((r): r is string => r !== null)
    .map((r) => JSON.parse(r) as TransferTemplate)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
}

export async function saveTemplate(tpl: TransferTemplate): Promise<void> {
  const redis = getRedisClient()
  // Templates don't expire (user manages them)
  await redis.set(KEY(tpl.userId, tpl.id), JSON.stringify(tpl))
  await redis.sadd(IDX(tpl.userId), tpl.id)
}

export async function deleteTemplate(
  userId: string,
  id: string,
): Promise<void> {
  const redis = getRedisClient()
  await redis.del(KEY(userId, id))
  await redis.srem(IDX(userId), id)
}
