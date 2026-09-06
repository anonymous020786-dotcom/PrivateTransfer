import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import {
  getStorageClient,
  getStorageBucket,
  getStorageClass,
  isStorageConfigured,
} from '../../../../lib/storage'
import {
  saveTransfer,
  expiryDate,
  defaultExpiryDays,
  hashPassword,
  addUserTransferIndex,
  sweepExpiredTransfers,
} from '../../../../lib/transfer'
import { getSupabaseServerClient } from '../../../../supabase/server'
import { lookupApiKey } from '../../../../lib/apiKeys'
import { generateShortSlug } from '../../../../slugs'
import { rateLimit, getClientIp } from '../../../../rateLimit'
import { tooManyRequests, ok, err } from '../../../../lib/apiResponse'
import { verifyRecaptcha } from '../../../../recaptcha'
import { isFeatureEnabled } from '../../../../lib/appSettings'
import { slugExists } from '../../../../lib/transfer'

export const dynamic = 'force-dynamic'

// 200 GB total per transfer; individual files are limited by S3/R2 single-PUT cap (~5 GB).
// For > 5 GB single files, multipart upload support can be added as a future enhancement.
const MAX_BYTES = Number(
  process.env.NEXT_PUBLIC_TRANSFER_MAX_BYTES ?? 200 * 1024 * 1024 * 1024,
)
const MAX_FILES = 20

const FileSchema = z.object({
  name: z.string().min(1).max(500),
  size: z.number().int().nonnegative(),
  type: z.string().max(200),
  path: z.string().max(1000).optional(),
})

const BodySchema = z.object({
  files: z.array(FileSchema).min(1).max(MAX_FILES),
  title: z.string().max(200).default(''),
  message: z.string().max(1000).default(''),
  password: z.string().max(200).optional(),
  expiryDays: z.number().int().min(1).max(365).optional(),
  maxDownloads: z.number().int().positive().nullable().default(null),
  notifyEmail: z.string().email().optional().or(z.literal('')),
  notifyEveryDownload: z.boolean().default(false),
  webhookUrl: z.string().url().max(500).optional().or(z.literal('')),
  recipientEmails: z.array(z.string().email()).max(20).default([]),
  burnAfterRead: z.boolean().default(false),
  background: z.string().max(500).optional(),
  encrypted: z.boolean().default(false),
  logoUrl: z.string().url().max(2000).optional().or(z.literal('')),
  backgroundImageUrl: z.string().url().max(2000).optional().or(z.literal('')),
  recaptchaToken: z.string().optional(),
  customSlug: z
    .string()
    .regex(
      /^[a-z0-9-]{3,60}$/,
      'Slug must be 3–60 lowercase letters, digits or hyphens',
    )
    .optional(),
  senderName: z.string().max(80).optional().or(z.literal('')),
  scheduledAt: z.string().datetime().optional(),
  slackWebhookUrl: z.string().url().max(500).optional().or(z.literal('')),
  emailAccentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  replyTo: z.string().email().max(200).optional().or(z.literal('')),
  workspaceId: z.string().max(64).optional().or(z.literal('')),
  passwordHint: z.string().max(100).optional().or(z.literal('')),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req)
  const rl = await rateLimit(`transfer-create:${ip}`, {
    limit: 10,
    windowSeconds: 600,
  })
  if (!rl.success) return tooManyRequests(rl)

  if (!(await isStorageConfigured())) {
    return err('Cloud transfers are not configured on this server.', {
      status: 503,
    })
  }

  if (!(await isFeatureEnabled('feature_cloud_transfers', true))) {
    return err(
      'Cloud transfers are temporarily disabled by the administrator. Please try again later.',
      { status: 503 },
    )
  }

  const body = BodySchema.safeParse(await req.json().catch(() => null))
  if (!body.success) return err('Invalid payload.')

  const {
    files,
    title,
    message,
    password,
    maxDownloads,
    notifyEmail,
    notifyEveryDownload,
    webhookUrl,
    recipientEmails,
    burnAfterRead,
    background,
    encrypted,
    logoUrl,
    backgroundImageUrl,
    recaptchaToken,
    customSlug: requestedSlug,
    senderName,
    scheduledAt,
    slackWebhookUrl,
    emailAccentColor,
    replyTo,
    workspaceId: requestedWorkspaceId,
  } = body.data

  const captcha = await verifyRecaptcha(recaptchaToken, { minScore: 0.3 })
  if (!captcha.ok)
    return err('Spam check failed. Please try again.', { status: 400 })

  const totalSize = files.reduce((s, f) => s + f.size, 0)
  if (totalSize > MAX_BYTES)
    return err(`Total size exceeds ${formatBytes(MAX_BYTES)} limit.`)

  try {
    // Auth: session cookie OR Bearer API key
    let ownerId: string | null = null
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer zync_')) {
      const lookup = await lookupApiKey(authHeader.slice(7))
      if (lookup) ownerId = lookup.userId
    } else {
      const supabase = await getSupabaseServerClient()
      const user = supabase ? (await supabase.auth.getUser()).data.user : null
      ownerId = user?.id ?? null
    }

    const days = body.data.expiryDays ?? defaultExpiryDays(!!ownerId)
    // Guests: max 7 days. Logged-in: max 365 days (1 year, WeTransfer Pro parity)
    const maxDays = ownerId ? 365 : 7
    const expiryDays = Math.min(days, maxDays)

    // Resolve slug: custom (logged-in only) or random
    let slug: string
    let isCustomSlug = false
    if (requestedSlug && ownerId) {
      if (await slugExists(requestedSlug)) {
        return err('That link name is already taken. Please choose another.', {
          status: 409,
        })
      }
      slug = requestedSlug
      isCustomSlug = true
    } else {
      slug = await generateShortSlug()
    }
    const storage = await getStorageClient()
    const bucket = await getStorageBucket()
    const storageClass = await getStorageClass()

    void sweepExpiredTransfers()

    const uploadUrls: string[] = []
    const fileRecords: Array<{
      key: string
      name: string
      size: number
      type: string
    }> = []

    for (const f of files) {
      const key = `${slug}/${crypto.randomUUID()}_${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const cmd = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: f.type || 'application/octet-stream',
        ContentLength: f.size,
        // S3: use Intelligent-Tiering for cost savings on infrequently accessed files
        ...(storageClass ? { StorageClass: storageClass } : {}),
      })
      // 4-hour window gives enough time for large file uploads to start
      const url = await getSignedUrl(storage, cmd, { expiresIn: 14400 })
      uploadUrls.push(url)
      fileRecords.push({
        key,
        name: f.name,
        size: f.size,
        type: f.type,
        ...(f.path ? { path: f.path } : {}),
      })
    }

    const expires = expiryDate(expiryDays)

    await saveTransfer({
      slug,
      ownerId,
      files: fileRecords,
      totalSize,
      expiresAt: expires,
      expiryDays,
      maxDownloads,
      downloadCount: 0,
      downloadEvents: [],
      title,
      message,
      passwordHash: password ? hashPassword(password) : null,
      passwordHint: body.data.passwordHint || null,
      notifyEmail: notifyEmail || null,
      notifyEveryDownload,
      webhookUrl: webhookUrl || null,
      notifiedAt: null,
      recipientEmails,
      burnAfterRead,
      background: background || null,
      encrypted,
      logoUrl: logoUrl || null,
      backgroundImageUrl: backgroundImageUrl || null,
      recipientTokens: {},
      reviews: [],
      comments: [],
      senderName: senderName || null,
      scheduledAt: scheduledAt || null,
      notificationSent: !scheduledAt,
      boardIds: [],
      customSlug: isCustomSlug,
      slackWebhookUrl: slackWebhookUrl || null,
      emailAccentColor: emailAccentColor || null,
      replyTo: replyTo || null,
      pageViewCount: 0,
      emailOpenCount: 0,
      expireWarnedAt: null,
      workspaceId:
        requestedWorkspaceId && ownerId ? requestedWorkspaceId : null,
      scanStatus: null,
      scanAnalysisId: null,
      createdAt: new Date().toISOString(),
      completed: false,
    })

    if (ownerId) {
      await addUserTransferIndex(ownerId, slug, expires)
    }

    return ok({ slug, uploadUrls, expiresAt: expires }, { status: 201, rl })
  } catch (e) {
    console.error('[transfer/create]', e)
    return err('Failed to create transfer. Please try again.', { status: 500 })
  }
}

function formatBytes(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(0)} TB`
  if (n >= 1e9) return `${(n / 1e9).toFixed(0)} GB`
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)} MB`
  return `${n} B`
}
