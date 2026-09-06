import 'server-only'
import { createHash } from 'crypto'
import { getRedisClient } from '../redisClient'
import { DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { getStorageClient, getStorageBucket } from './storage'

export type TransferFile = {
  key: string
  name: string
  size: number
  type: string
  path?: string // relative path including folders, e.g. "folder/subfolder/file.txt"
}

export type DownloadEvent = {
  at: string // ISO timestamp
  ipHash: string // SHA-256 of raw IP (privacy-preserving)
  country: string // CF-IPCountry header or 'XX'
}

export type ReviewEntry = {
  rating: number // 1-5
  comment: string
  at: string // ISO timestamp
  country: string
}

export type RecipientToken = {
  email: string
  downloadedAt?: string // ISO timestamp, set when recipient downloads
}

export type CommentEntry = {
  text: string
  at: string
  country: string
}

export type TransferRecord = {
  slug: string
  ownerId: string | null
  files: TransferFile[]
  totalSize: number
  expiresAt: string
  expiryDays: number
  maxDownloads: number | null
  downloadCount: number
  downloadEvents: DownloadEvent[] // per-download tracking (capped at 500)
  title: string
  message: string
  passwordHash: string | null
  passwordHint: string | null
  notifyEmail: string | null
  notifyEveryDownload: boolean
  notifiedAt: string | null
  recipientEmails: string[]
  recipientTokens: Record<string, RecipientToken> // token -> { email, downloadedAt? }
  createdAt: string
  completed: boolean
  burnAfterRead: boolean
  background: string | null
  logoUrl: string | null
  backgroundImageUrl: string | null
  webhookUrl: string | null
  encrypted: boolean
  reviews: ReviewEntry[]
  comments: CommentEntry[] // recipient open-text messages (capped at 200)
  senderName: string | null // custom "From" display name in recipient emails
  scheduledAt: string | null // ISO timestamp: hold notification emails until this time
  notificationSent: boolean // true once scheduled email has been dispatched
  boardIds: string[] // board slugs this transfer belongs to
  customSlug: boolean // true if slug was user-chosen (not random)
  slackWebhookUrl: string | null // Slack incoming webhook — notified on each download
  emailAccentColor: string | null // hex color for CTA button in recipient emails
  replyTo: string | null // Reply-To header in recipient emails (sender's email)
  pageViewCount: number // how many times the download page was opened
  emailOpenCount: number // how many times the recipient email tracking pixel was loaded
  expireWarnedAt: string | null // ISO timestamp when the expiry-warning email was sent
  workspaceId: string | null // workspace this transfer belongs to
  scanStatus:
    | 'pending'
    | 'scanning'
    | 'clean'
    | 'infected'
    | 'error'
    | 'skipped'
    | null
  scanAnalysisId: string | null // VirusTotal analysis ID while polling
}

const KEY = (slug: string) => `transfer:${slug}`
const USER_KEY = (ownerId: string) => `transfer:user:${ownerId}`
const CLEANUP_KEY = 'transfer:cleanup'

// Max 1 year + 5 days buffer for Redis TTLs
const MAX_TTL_SECONDS = 370 * 24 * 3600

export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16)
}

export function expiryDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export function defaultExpiryDays(loggedIn: boolean): number {
  return loggedIn ? 30 : 7
}

export async function saveTransfer(record: TransferRecord): Promise<void> {
  const redis = getRedisClient()
  const expiresMs = new Date(record.expiresAt).getTime()
  const ttl = Math.ceil((expiresMs - Date.now()) / 1000)
  if (ttl <= 0) return
  await redis.set(KEY(record.slug), JSON.stringify(record), 'EX', ttl)
  const entry = JSON.stringify({
    slug: record.slug,
    keys: record.files.map((f) => f.key),
  })
  await redis.zadd(CLEANUP_KEY, expiresMs, entry)
  await redis.expire(CLEANUP_KEY, MAX_TTL_SECONDS)
}

export async function getTransfer(
  slug: string,
): Promise<TransferRecord | null> {
  const redis = getRedisClient()
  const raw = await redis.get(KEY(slug))
  if (!raw) return null
  try {
    const r = JSON.parse(raw) as TransferRecord
    // Back-compat defaults for records created before these fields existed
    r.downloadEvents ??= []
    r.background ??= null
    r.recipientTokens ??= {}
    r.logoUrl ??= null
    r.backgroundImageUrl ??= null
    r.reviews ??= []
    r.comments ??= []
    r.senderName ??= null
    r.scheduledAt ??= null
    r.notificationSent ??= true // existing records already sent
    r.boardIds ??= []
    r.customSlug ??= false
    r.slackWebhookUrl ??= null
    r.emailAccentColor ??= null
    r.replyTo ??= null
    r.pageViewCount ??= 0
    r.emailOpenCount ??= 0
    r.expireWarnedAt ??= null
    r.workspaceId ??= null
    r.scanStatus ??= null
    r.scanAnalysisId ??= null
    r.passwordHint ??= null
    return r
  } catch {
    return null
  }
}

export async function updateTransfer(
  slug: string,
  patch: Partial<TransferRecord>,
): Promise<void> {
  const redis = getRedisClient()
  const existing = await getTransfer(slug)
  if (!existing) return
  const updated = { ...existing, ...patch }
  const ttl = Math.ceil(
    (new Date(updated.expiresAt).getTime() - Date.now()) / 1000,
  )
  if (ttl <= 0) return
  await redis.set(KEY(slug), JSON.stringify(updated), 'EX', ttl)
}

export async function deleteTransfer(slug: string): Promise<void> {
  const redis = getRedisClient()
  await redis.del(KEY(slug))
  await purgeCleanupEntries(slug)
}

async function purgeCleanupEntries(slug: string): Promise<void> {
  const redis = getRedisClient()
  const all = await redis.zrange(CLEANUP_KEY, 0, -1)
  const toRemove = all.filter((entry) => {
    try {
      return JSON.parse(entry).slug === slug
    } catch {
      return false
    }
  })
  if (toRemove.length > 0) {
    await redis.zrem(CLEANUP_KEY, ...toRemove)
  }
}

export async function sweepExpiredTransfers(limit = 20): Promise<number> {
  const redis = getRedisClient()
  const now = Date.now()
  const expired = await redis.zrangebyscore(
    CLEANUP_KEY,
    '-inf',
    now,
    'LIMIT',
    0,
    limit,
  )
  if (expired.length === 0) return 0

  const storageKeys: string[] = []
  const entries: string[] = []

  for (const entry of expired) {
    entries.push(entry)
    try {
      const { keys } = JSON.parse(entry) as { slug: string; keys: string[] }
      storageKeys.push(...keys)
    } catch {}
  }

  if (storageKeys.length > 0) {
    try {
      const client = await getStorageClient()
      await client.send(
        new DeleteObjectsCommand({
          Bucket: await getStorageBucket(),
          Delete: { Objects: storageKeys.map((Key) => ({ Key })), Quiet: true },
        }),
      )
    } catch {
      // best-effort — lifecycle rule is a safety net
    }
  }

  await redis.zrem(CLEANUP_KEY, ...entries)
  return entries.length
}

export async function addUserTransferIndex(
  ownerId: string,
  slug: string,
  expiresAt: string,
): Promise<void> {
  const redis = getRedisClient()
  const score = new Date(expiresAt).getTime()
  await redis.zadd(USER_KEY(ownerId), score, slug)
  await redis.expire(USER_KEY(ownerId), MAX_TTL_SECONDS)
}

export async function removeUserTransferIndex(
  ownerId: string,
  slug: string,
): Promise<void> {
  const redis = getRedisClient()
  await redis.zrem(USER_KEY(ownerId), slug)
}

export async function listUserTransfers(
  ownerId: string,
): Promise<TransferRecord[]> {
  const redis = getRedisClient()
  const slugs = await redis.zrangebyscore(USER_KEY(ownerId), Date.now(), '+inf')
  if (slugs.length === 0) return []
  const records = await Promise.all(slugs.map(getTransfer))
  const valid = records.filter(
    (r): r is TransferRecord => r !== null && r.completed,
  )
  await redis.zremrangebyscore(USER_KEY(ownerId), '-inf', Date.now() - 1)
  return valid.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export async function scheduleBurn(
  slug: string,
  keys: string[],
): Promise<void> {
  const redis = getRedisClient()
  const burnAt = Date.now() + 30_000
  await purgeCleanupEntries(slug)
  const entry = JSON.stringify({ slug, keys })
  await redis.zadd(CLEANUP_KEY, burnAt, entry)
  await redis.expire(KEY(slug), 30)
}

// Append a download event (capped at 500 to bound Redis key size)
export async function recordDownloadEvent(
  slug: string,
  event: DownloadEvent,
): Promise<void> {
  const transfer = await getTransfer(slug)
  if (!transfer) return
  const events = transfer.downloadEvents ?? []
  if (events.length < 500) events.push(event)
  await updateTransfer(slug, { downloadEvents: events })
}

// Mark a recipient token as downloaded
export async function markRecipientDownloaded(
  slug: string,
  token: string,
): Promise<void> {
  const transfer = await getTransfer(slug)
  if (!transfer) return
  const tokens = { ...(transfer.recipientTokens ?? {}) }
  if (!tokens[token]) return
  tokens[token] = { ...tokens[token], downloadedAt: new Date().toISOString() }
  await updateTransfer(slug, { recipientTokens: tokens })
}

// Append a review (capped at 100)
export async function recordReview(
  slug: string,
  review: ReviewEntry,
): Promise<void> {
  const transfer = await getTransfer(slug)
  if (!transfer) return
  const reviews = transfer.reviews ?? []
  if (reviews.length < 100) reviews.push(review)
  await updateTransfer(slug, { reviews })
}

// Append a recipient comment (capped at 200)
export async function recordComment(
  slug: string,
  comment: CommentEntry,
): Promise<void> {
  const transfer = await getTransfer(slug)
  if (!transfer) return
  const comments = transfer.comments ?? []
  if (comments.length < 200) comments.push(comment)
  await updateTransfer(slug, { comments })
}

// Check if a slug is already taken
export async function slugExists(slug: string): Promise<boolean> {
  const redis = getRedisClient()
  return (await redis.exists(KEY(slug))) === 1
}

// Extend expiry of a transfer by N additional days (owner action)
export async function renewTransfer(
  slug: string,
  addDays: number,
): Promise<string | null> {
  const transfer = await getTransfer(slug)
  if (!transfer) return null
  const current = new Date(transfer.expiresAt)
  current.setDate(current.getDate() + addDays)
  const newExpiry = current.toISOString()
  await updateTransfer(slug, { expiresAt: newExpiry })
  // Update cleanup index
  const redis = getRedisClient()
  await redis.expire(
    KEY(slug),
    Math.ceil((current.getTime() - Date.now()) / 1000),
  )
  await redis.zadd(
    CLEANUP_KEY,
    current.getTime(),
    JSON.stringify({ slug, keys: transfer.files.map((f) => f.key) }),
  )
  return newExpiry
}

// Mark scheduled notification as sent
export async function markNotificationSent(slug: string): Promise<void> {
  await updateTransfer(slug, { notificationSent: true })
}
