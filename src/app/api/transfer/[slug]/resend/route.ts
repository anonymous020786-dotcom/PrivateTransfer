import { NextRequest, NextResponse } from 'next/server'
import { getTransfer } from '../../../../../lib/transfer'
import { getSupabaseServerClient } from '../../../../../supabase/server'
import { sendMail } from '../../../../../email'
import { tplTransferReady } from '../../../../../emailTemplates'
import { brand } from '../../../../../brand'
import { isFeatureEnabled } from '../../../../../lib/appSettings'
import { rateLimit, getClientIp } from '../../../../../rateLimit'

export const dynamic = 'force-dynamic'

function formatBytes(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} KB`
  return `${n} B`
}

// POST /api/transfer/[slug]/resend — re-send notification emails to all recipients
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params
  const ip = getClientIp(req)
  const rl = await rateLimit(`resend:${ip}`, { limit: 10, windowSeconds: 600 })
  if (!rl.success)
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })

  const transfer = await getTransfer(slug)
  if (!transfer || !transfer.completed)
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  const supabase = await getSupabaseServerClient()
  const user = supabase ? (await supabase.auth.getUser()).data.user : null
  if (!transfer.ownerId || transfer.ownerId !== user?.id)
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  if (transfer.recipientEmails.length === 0)
    return NextResponse.json(
      { error: 'No recipients on this transfer.' },
      { status: 400 },
    )

  const whiteLabelEmails = await isFeatureEnabled(
    'feature_white_label_emails',
    false,
  )
  const baseUrl = `${brand.url}/transfer/${transfer.slug}`

  let sent = 0
  for (const to of transfer.recipientEmails) {
    const token = Object.entries(transfer.recipientTokens ?? {}).find(
      ([, v]) => v.email === to,
    )?.[0]
    const url = token ? `${baseUrl}?rt=${token}` : baseUrl
    const tpl = tplTransferReady({
      title: transfer.title,
      url,
      senderMessage: transfer.message,
      fileCount: transfer.files.length,
      totalSize: formatBytes(transfer.totalSize),
      expiresAt: transfer.expiresAt,
      senderName: transfer.senderName || undefined,
      emailAccentColor: transfer.emailAccentColor || undefined,
      hideBranding: whiteLabelEmails,
      trackingPixelUrl: `${brand.url}/api/transfer/${transfer.slug}/open`,
    })
    const result = await sendMail({
      to,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      replyTo: transfer.replyTo || undefined,
    })
    if (result.success) sent++
  }

  return NextResponse.json({ ok: true, sent })
}
