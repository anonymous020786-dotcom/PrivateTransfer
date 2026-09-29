import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  getTransfer,
  deleteTransfer,
  removeUserTransferIndex,
  updateTransfer,
  hashPassword,
  expiryDate,
  tokenMatches,
} from '../../../../lib/transfer'
import { recordActivity, requestContext } from '../../../../lib/activity'
import { deleteStoredObjects } from '../../../../lib/storage'
import { checkWebhookUrl } from '../../../../lib/webhooks'
import { getSupabaseServerClient } from '../../../../supabase/server'

export const dynamic = 'force-dynamic'

async function cleanupR2(keys: string[]): Promise<void> {
  try {
    await deleteStoredObjects(keys)
  } catch {
    // best-effort
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params
  const transfer = await getTransfer(slug)

  if (!transfer || !transfer.completed) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  // Auto-cleanup expired transfer (R2 cost saving)
  if (new Date(transfer.expiresAt) < new Date()) {
    void cleanupR2(transfer.files.map((f) => f.key))
    void deleteTransfer(slug)
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  // Public view: an explicit allow-list, so new record fields are private by
  // default. Owners additionally see their settings and recipient list.
  const supabase = await getSupabaseServerClient()
  const user = supabase ? (await supabase.auth.getUser()).data.user : null
  const isOwner = !!transfer.ownerId && transfer.ownerId === user?.id
  return NextResponse.json({
    slug: transfer.slug,
    title: transfer.title,
    message: transfer.message,
    senderName: transfer.senderName,
    totalSize: transfer.totalSize,
    createdAt: transfer.createdAt,
    expiresAt: transfer.expiresAt,
    completed: transfer.completed,
    encrypted: transfer.encrypted,
    burnAfterRead: transfer.burnAfterRead,
    maxDownloads: transfer.maxDownloads,
    downloadCount: transfer.downloadCount,
    passwordProtected: !!transfer.passwordHash,
    passwordHint: transfer.passwordHint,
    background: transfer.background,
    logoUrl: transfer.logoUrl,
    backgroundImageUrl: transfer.backgroundImageUrl,
    scanStatus: transfer.scanStatus,
    files: transfer.files.map(({ name, size, type, path, sha256 }) => ({
      name,
      size,
      type,
      ...(path ? { path } : {}),
      ...(sha256 ? { sha256 } : {}),
    })),
    ...(isOwner
      ? {
          owner: true,
          recipientEmails: transfer.recipientEmails,
          notifyEmail: transfer.notifyEmail,
          notifyEveryDownload: transfer.notifyEveryDownload,
          webhookUrl: transfer.webhookUrl,
          slackWebhookUrl: transfer.slackWebhookUrl,
          pageViewCount: transfer.pageViewCount,
          emailOpenCount: transfer.emailOpenCount,
          scheduledAt: transfer.scheduledAt,
        }
      : {}),
  })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params
  const transfer = await getTransfer(slug)
  if (!transfer)
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  const supabase = await getSupabaseServerClient()
  const user = supabase ? (await supabase.auth.getUser()).data.user : null
  // Owners delete with their session. Guest transfers have no owner, so the
  // creator proves authorship with the secret upload token from create.
  const token =
    req.headers.get('x-upload-token') ??
    req.nextUrl.searchParams.get('token') ??
    undefined
  const allowed = transfer.ownerId
    ? transfer.ownerId === user?.id
    : tokenMatches(token, transfer.uploadTokenHash)
  if (!allowed)
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  await cleanupR2(transfer.files.map((f) => f.key))
  await deleteTransfer(slug)

  if (transfer.ownerId) {
    void removeUserTransferIndex(transfer.ownerId, slug)
    void recordActivity(transfer.ownerId, 'transfer.deleted', {
      ...requestContext(req),
      detail: transfer.title || slug,
    })
  }

  return NextResponse.json({ ok: true })
}

const PatchSchema = z.object({
  title: z.string().max(200).optional(),
  message: z.string().max(1000).optional(),
  extendDays: z.number().int().min(1).max(365).optional(),
  maxDownloads: z.number().int().positive().nullable().optional(),
  password: z.string().max(200).optional(),
  clearPassword: z.boolean().optional(),
  notifyEmail: z.string().email().optional().or(z.literal('')),
  notifyEveryDownload: z.boolean().optional(),
  webhookUrl: z.string().url().max(500).optional().or(z.literal('')),
  passwordHint: z.string().max(100).optional().or(z.literal('')),
  recipientEmails: z.array(z.string().email()).max(50).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params
  const transfer = await getTransfer(slug)
  if (!transfer)
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  const supabase = await getSupabaseServerClient()
  const user = supabase ? (await supabase.auth.getUser()).data.user : null
  if (!transfer.ownerId || transfer.ownerId !== user?.id)
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const body = PatchSchema.safeParse(await req.json().catch(() => null))
  if (!body.success)
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })

  const {
    title,
    message,
    extendDays,
    maxDownloads,
    password,
    clearPassword,
    notifyEmail,
    notifyEveryDownload,
    webhookUrl,
    passwordHint,
    recipientEmails,
  } = body.data
  const patch: Partial<Parameters<typeof updateTransfer>[1]> = {}

  if (title !== undefined) patch.title = title
  if (message !== undefined) patch.message = message
  if (maxDownloads !== undefined) patch.maxDownloads = maxDownloads
  if (notifyEmail !== undefined) patch.notifyEmail = notifyEmail || null
  if (notifyEveryDownload !== undefined)
    patch.notifyEveryDownload = notifyEveryDownload
  if (webhookUrl) {
    const problem = await checkWebhookUrl(webhookUrl)
    if (problem) return NextResponse.json({ error: problem }, { status: 400 })
  }
  if (webhookUrl !== undefined) patch.webhookUrl = webhookUrl || null

  if (clearPassword) {
    patch.passwordHash = null
    patch.passwordHint = null
  } else if (password) {
    patch.passwordHash = hashPassword(password)
  }
  if (passwordHint !== undefined) patch.passwordHint = passwordHint || null
  if (recipientEmails !== undefined) patch.recipientEmails = recipientEmails

  if (extendDays !== undefined) {
    const current = new Date(transfer.expiresAt)
    const extended = new Date(current.getTime() + extendDays * 86400000)
    const maxExpiry = new Date(transfer.createdAt)
    maxExpiry.setFullYear(maxExpiry.getFullYear() + 1)
    patch.expiresAt = (
      extended > maxExpiry ? maxExpiry : extended
    ).toISOString()
  }

  await updateTransfer(slug, patch)
  const updated = await getTransfer(slug)
  return NextResponse.json({ ok: true, transfer: updated })
}
