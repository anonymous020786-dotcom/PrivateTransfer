import { NextRequest, NextResponse } from 'next/server'
import {
  sweepExpiredTransfers,
  getTransfer,
  markNotificationSent,
  updateTransfer,
} from '../../../../lib/transfer'
import { getRedisClient } from '../../../../redisClient'
import { sendMail } from '../../../../email'
import {
  tplTransferReady,
  tplTransferExpiring,
} from '../../../../emailTemplates'
import { brand } from '../../../../brand'
import { isFeatureEnabled } from '../../../../lib/appSettings'

export const dynamic = 'force-dynamic'

function formatBytes(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} KB`
  return `${n} B`
}

// Called by VPS cron every 5 minutes.
// 1. Sweeps expired/burned R2 objects.
// 2. Dispatches recipient emails for scheduled transfers whose sendAt has passed.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured.' },
      { status: 503 },
    )
  }

  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

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
    console.error('[cron/cleanup] scheduled dispatch error:', e)
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
    console.error('[cron/cleanup] expiry warning error:', e)
  }

  return NextResponse.json({
    ok: true,
    deleted,
    dispatched,
    warned,
    ts: new Date().toISOString(),
  })
}
