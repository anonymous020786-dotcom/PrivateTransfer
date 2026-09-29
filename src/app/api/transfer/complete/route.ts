import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  getTransfer,
  updateTransfer,
  tokenMatches,
} from '../../../../lib/transfer'
import { getRedisClient } from '../../../../redisClient'
import { getSupabaseServerClient } from '../../../../supabase/server'
import { sendMail } from '../../../../email'
import { tplTransferReady, tplTransferSent } from '../../../../emailTemplates'
import { brand } from '../../../../brand'
import { isFeatureEnabled } from '../../../../lib/appSettings'
import { enqueueScan } from '../../../../lib/virusScan'
import { completeMultipartUpload, partSizeFor } from '../../../../lib/storage'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  slug: z.string().min(1).max(120),
  uploadToken: z.string().max(128).optional(),
  // ETags for files uploaded in parts (see MULTIPART_THRESHOLD).
  multipart: z
    .array(
      z.object({
        fileIndex: z.number().int().nonnegative(),
        parts: z
          .array(
            z.object({
              partNumber: z.number().int().min(1).max(10000),
              etag: z.string().min(1).max(200),
            }),
          )
          .min(1)
          .max(10000),
      }),
    )
    .max(20)
    .default([]),
  // Uploader-computed SHA-256 (hex) of each original file, index-aligned.
  checksums: z
    .array(
      z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .nullable(),
    )
    .max(20)
    .optional(),
})

function formatBytes(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} KB`
  return `${n} B`
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = BodySchema.safeParse(await req.json().catch(() => null))
  if (!body.success)
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })

  const existing = await getTransfer(body.data.slug)
  if (!existing)
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  // Only the creator may complete a transfer: they hold the upload token from
  // /api/transfer/create (or are the signed-in owner). Legacy records created
  // before tokens existed carry no hash and remain completable once.
  let authorised =
    existing.uploadTokenHash === null ||
    tokenMatches(body.data.uploadToken, existing.uploadTokenHash)
  if (!authorised && existing.ownerId) {
    const supabase = await getSupabaseServerClient()
    const user = supabase ? (await supabase.auth.getUser()).data.user : null
    authorised = user?.id === existing.ownerId
  }
  if (!authorised)
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  // Idempotent: completing twice must not re-send emails or rotate the
  // per-recipient tracking tokens.
  if (existing.completed)
    return NextResponse.json({ ok: true, alreadyCompleted: true })

  // Assemble multipart uploads before the transfer becomes downloadable.
  const files = existing.files.map((f) => ({ ...f }))
  for (const [i, f] of files.entries()) {
    if (!f.multipartUploadId) continue
    const report = body.data.multipart.find((m) => m.fileIndex === i)
    const expected = Math.ceil(f.size / partSizeFor(f.size))
    const numbers = report?.parts.map((p) => p.partNumber).sort((a, b) => a - b)
    if (
      !report ||
      numbers!.length !== expected ||
      numbers!.some((n, idx) => n !== idx + 1)
    ) {
      return NextResponse.json(
        { error: `Upload of "${f.name}" is incomplete.` },
        { status: 400 },
      )
    }
    try {
      await completeMultipartUpload(f.key, f.multipartUploadId, report.parts)
    } catch (e) {
      console.error('[transfer/complete] multipart', e)
      return NextResponse.json(
        { error: `Could not finalise "${f.name}". Please retry.` },
        { status: 400 },
      )
    }
    delete f.multipartUploadId
  }
  body.data.checksums?.forEach((c, i) => {
    if (c && files[i]) files[i].sha256 = c
  })

  await updateTransfer(body.data.slug, { completed: true, files })
  const t = await getTransfer(body.data.slug)

  // Enqueue virus scan if feature is enabled (fire-and-forget)
  if (t) {
    void isFeatureEnabled('feature_virus_scan', false).then(async (enabled) => {
      if (enabled) {
        await updateTransfer(body.data.slug, { scanStatus: 'pending' })
        await enqueueScan(body.data.slug)
      }
    })
  }

  if (t && t.recipientEmails.length > 0) {
    const baseUrl = `${brand.url}/transfer/${t.slug}`
    // Generate a unique token per recipient for per-person download tracking
    const recipientTokens: Record<string, { email: string }> = {}
    const emailTokenMap: Record<string, string> = {}
    for (const email of t.recipientEmails) {
      const token = crypto.randomUUID().replace(/-/g, '')
      recipientTokens[token] = { email }
      emailTokenMap[email] = token
    }
    await updateTransfer(body.data.slug, { recipientTokens })

    // Skip recipient emails if transfer is scheduled for future delivery
    if (!t.scheduledAt || new Date(t.scheduledAt) <= new Date()) {
      const whiteLabelEmails = await isFeatureEnabled(
        'feature_white_label_emails',
        false,
      )
      for (const to of t.recipientEmails) {
        const token = emailTokenMap[to]
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
      await updateTransfer(body.data.slug, { notificationSent: true })
    } else if (t.scheduledAt) {
      // Register in the scheduled queue so the cron picks it up
      const redis = getRedisClient()
      await redis.zadd(
        'transfer:scheduled',
        new Date(t.scheduledAt).getTime(),
        t.slug,
      )
    }
  }

  // Send "transfer ready" confirmation to sender (fire-and-forget)
  if (t) {
    const url = `${brand.url}/transfer/${t.slug}`
    let senderEmail: string | null = null
    try {
      const supabase = await getSupabaseServerClient()
      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        senderEmail = user?.email ?? null
      }
    } catch {
      /* ignore */
    }
    // Fall back to notifyEmail if no account email
    senderEmail = senderEmail ?? t.notifyEmail
    if (senderEmail) {
      const tpl = tplTransferSent({
        title: t.title,
        url,
        fileCount: t.files.length,
        totalSize: formatBytes(t.totalSize),
        expiresAt: t.expiresAt,
        recipientCount: t.recipientEmails.length,
      })
      void sendMail({
        to: senderEmail,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      })
    }
  }

  // Save recipient emails to address book (fire-and-forget)
  if (t && t.recipientEmails.length > 0 && t.ownerId) {
    void (async () => {
      try {
        const redis = getRedisClient()
        const key = `contacts:${t.ownerId}`
        for (const email of t.recipientEmails)
          await redis.zincrby(key, 1, email)
        await redis.expire(key, 365 * 24 * 3600)
      } catch {
        /* best-effort */
      }
    })()
  }

  // Record in Supabase history (best-effort)
  if (t) {
    try {
      const supabase = await getSupabaseServerClient()
      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('transfers').insert({
            user_id: user.id,
            slug: t.slug,
            title: t.title || t.message || null,
            files: t.files.map((f) => f.name),
            file_count: t.files.length,
            total_bytes: t.totalSize,
          })
        }
      }
    } catch {
      // best-effort
    }
  }

  return NextResponse.json({ ok: true })
}
