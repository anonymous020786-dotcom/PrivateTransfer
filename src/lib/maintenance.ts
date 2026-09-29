import 'server-only'
import {
  sweepExpiredTransfers,
  getTransfer,
  markNotificationSent,
  updateTransfer,
} from './transfer'
import { getRedisClient } from '../redisClient'
import { sendMail } from '../email'
import { tplTransferReady, tplTransferExpiring } from '../emailTemplates'
import { brand } from '../brand'
import { isFeatureEnabled } from './appSettings'
import { getStorageProvider } from './storage'
import { pruneStaleMultipart } from '../local/objects'

// Periodic housekeeping, run by /api/cron/cleanup (external cron) or the
// in-process scheduler (src/instrumentation.ts):
//   1. sweep expired / burned transfers and their stored objects
//   2. dispatch recipient emails for scheduled transfers that are due
//   3. send 24-hour expiry warnings
//   4. prune abandoned multipart uploads (local storage)

export type MaintenanceResult = {
  deleted: number
  dispatched: number
  warned: number
  prunedUploads: number
  ts: string
}

const LAST_RUN_KEY = 'maintenance:last'

function formatBytes(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} KB`
  return `${n} B`
}

export async function runMaintenance(): Promise<MaintenanceResult> {
  // Sweep expired transfers
  let deleted = 0
  for (let i = 0; i < 5; i++) {
    const n = await sweepExpiredTransfers(100)
    deleted += n
    if (n < 100) break
  }

  // Dispatch scheduled transfer emails
  let dispatched = 0
  try {
    const redis = getRedisClient()
    // scheduled transfers are stored in a sorted set keyed by sendAt timestamp
    const now = Date.now()
    const pending = await redis.zrangebyscore(
      'transfer:scheduled',
      '-inf',
      now,
      'LIMIT',
      0,
      20,
    )

    for (const slug of pending) {
      const t = await getTransfer(slug)
      if (!t || t.notificationSent) {
        await redis.zrem('transfer:scheduled', slug)
        continue
      }
      if (!t.scheduledAt || new Date(t.scheduledAt).getTime() > now) continue

      const baseUrl = `${brand.url}/transfer/${t.slug}`
      const whiteLabelEmails = await isFeatureEnabled(
        'feature_white_label_emails',
        false,
      )
      for (const to of t.recipientEmails) {
        // find token for this email
        const token = Object.entries(t.recipientTokens ?? {}).find(
          ([, v]) => v.email === to,
        )?.[0]
        const url = token ? `${baseUrl}?rt=${token}` : baseUrl
        const tpl = tplTransferReady({
          title: t.title,
          url,
          senderMessage: t.message,
          fileCount: t.files.length,
          totalSize: formatBytes(t.totalSize),
          expiresAt: t.expiresAt,
          senderName: t.senderName || undefined,
          emailAccentColor: t.emailAccentColor || undefined,
          hideBranding: whiteLabelEmails,
          trackingPixelUrl: `${brand.url}/api/transfer/${t.slug}/open`,
        })
        void sendMail({
          to,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
          replyTo: t.replyTo || undefined,
        })
      }

      await markNotificationSent(slug)
      await redis.zrem('transfer:scheduled', slug)
      dispatched++
    }
  } catch (e) {
    console.error('[maintenance] scheduled dispatch error:', e)
  }

  // Send expiry warning emails (24h window, once per transfer)
  let warned = 0
  try {
    const redis = getRedisClient()
    const now = Date.now()
    const in24h = now + 24 * 3600 * 1000
    // Find cleanup entries expiring within the next 24h
    const expiringSoon = await redis.zrangebyscore(
      'transfer:cleanup',
      now,
      in24h,
      'LIMIT',
      0,
      50,
    )
    for (const entry of expiringSoon) {
      try {
        const { slug } = JSON.parse(entry) as { slug: string }
        const t = await getTransfer(slug)
        if (!t || !t.completed || t.expireWarnedAt) continue
        // Only warn if transfer has a notifyEmail or owner
        const to = t.notifyEmail
        if (!to) {
          // Mark warned anyway so we don't re-process every tick
          await updateTransfer(slug, {
            expireWarnedAt: new Date().toISOString(),
          })
          continue
        }
        const hoursLeft = Math.round(
          (new Date(t.expiresAt).getTime() - now) / 3600000,
        )
        const tpl = tplTransferExpiring({
          title: t.title,
          url: `${brand.url}/transfer/${t.slug}`,
          expiresAt: t.expiresAt,
          hoursLeft,
        })
        void sendMail({
          to,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
        })
        await updateTransfer(slug, { expireWarnedAt: new Date().toISOString() })
        warned++
      } catch {
        /* best-effort per-transfer */
      }
    }
  } catch (e) {
    console.error('[maintenance] expiry warning error:', e)
  }

  let prunedUploads = 0
  try {
    if ((await getStorageProvider()) === 'local')
      prunedUploads = await pruneStaleMultipart(48 * 3600 * 1000)
  } catch (e) {
    console.error('[maintenance] multipart prune error:', e)
  }

  const result = {
    deleted,
    dispatched,
    warned,
    prunedUploads,
    ts: new Date().toISOString(),
  }
  try {
    await getRedisClient().set(LAST_RUN_KEY, JSON.stringify(result))
  } catch {
    // status bookkeeping only
  }
  return result
}

export async function lastMaintenanceRun(): Promise<MaintenanceResult | null> {
  try {
    const raw = await getRedisClient().get(LAST_RUN_KEY)
    return raw ? (JSON.parse(raw) as MaintenanceResult) : null
  } catch {
    return null
  }
}
