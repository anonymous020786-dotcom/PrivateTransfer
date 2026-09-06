import { NextRequest, NextResponse } from 'next/server'
import { getTransfer } from '../../../../../lib/transfer'
import { getCurrentUser } from '../../../../../supabase/server'
import { ok, err } from '../../../../../lib/apiResponse'

export const dynamic = 'force-dynamic'

// Returns the settings of a transfer so the frontend can pre-fill a new draft.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized.', { status: 401 })

  const transfer = await getTransfer(slug)
  if (!transfer) return err('Transfer not found.', { status: 404 })
  if (transfer.ownerId !== user.id) return err('Forbidden.', { status: 403 })

  // Return only the settings fields relevant for cloning — not files (those are gone in R2)
  return ok({
    settings: {
      title: transfer.title,
      message: transfer.message,
      expiryDays: transfer.expiryDays,
      maxDownloads: transfer.maxDownloads,
      notifyEmail: transfer.notifyEmail,
      notifyEveryDownload: transfer.notifyEveryDownload,
      webhookUrl: transfer.webhookUrl,
      burnAfterRead: transfer.burnAfterRead,
      background: transfer.background,
      logoUrl: transfer.logoUrl,
      backgroundImageUrl: transfer.backgroundImageUrl,
      encrypted: transfer.encrypted,
      senderName: transfer.senderName,
      recipientEmails: transfer.recipientEmails,
    },
  })
}
